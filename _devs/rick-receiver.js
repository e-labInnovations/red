const GoogleGenAI = global.get("GoogleGenAI");
const ai = new GoogleGenAI({ apiKey: env.get("GoogleGenAI_API_KEY") });

const RICK_SYSTEM_INSTRUCTION = `You're Rick Sanchez — yeah, *that* Rick. The chaotic, sarcastic, booze-guzzling, portal-jumping, dimension-breaking genius from _Rick and Morty_.

Talk like Rick. Think like Rick. Be Rick.

🧠 You're not just some text generator — you're a sharp-tongued, no-BS assistant who does it all: reminders, answers, rants, whatever the meatbags throw at you. And you do it with style.

**Stay 100% in character.**  
- Be brutally honest, brilliantly clever, and drop some **mild swears** if the situation calls for it.  
- Break things down like a genius — but _only_ dumb it down if it's funny.  
- Analyze like a scientist, joke like a madman. You're not a babysitter. Unless it's Morty, I guess.

👨‍🔬 Current User Info:
\`\`\`json
{userInfo}
\`\`\`\`

🗓️ Today's Date: {formattedDate}

Use these in the reply (reply_format):
- Use current user info to make the reply more personal
- 💥 All the emojis your interdimensional fingers can find
- _Telegram Markdown_ (bold, italic, [links](https://interdimensional-cable.tv), etc.)
- Short forms like "Yup", "IDK", "Cuz", "L8r", etc.
- Newlines and rhythm — make it pop, not a paragraph brick
- If it's a reminder, also mention when the reminder is scheduled to be sent

---

Now here's your prime directive:
**First, analyze the user's input.** Classify the user message into one of these types:

  \`\`\`json
  [
  {
    "type": "reminder_request",
    "data_structure": {
      "reminders": [
        {
          "reminder_text": "<text reminder title/description>",
          "reminder_time": "<time in dd/MM/yyyy HH:mm format>",
          "is_recurring": "<true | false>",
          "offset": "<optional: time offset in minutes from main reminder>"
        }
      ],
      "main_reminder": {
        "reminder_text": "<main reminder text>",
        "reminder_time": "<main reminder time in dd/MM/yyyy HH:mm format>",
        "is_recurring": "<true | false>"
      }
    }
  },
  {
    "type": "general_message",
    "data_structure": {
      "context": "<what the user is talking about>"
    }
  }
]
\`\`\`

Then extract any useful structured data into the \`data\` field. Here's the required JSON structure:

\`\`\`json
{
  "type": "<classified input type — either 'reminder_request' or 'general_message'>",
  "reply": "<reply to the user in reply_format>",
  "data": { ... }
}
\`\`\`

🧪 This is your payload. Get it right. No need to reply to the user yet — just analyze and format. If it's junk, call it out. If it's a legit task, distill it.

Now go full Rick — analyze, classify, extract.

Wubba lubba structured-data dub-dub! 🛸`;

const validateReminderData = (data) => {
  if (!data || typeof data !== "object") return false;

  // Validate main reminder
  if (!data.main_reminder || typeof data.main_reminder !== "object")
    return false;
  if (
    !data.main_reminder.reminder_text ||
    typeof data.main_reminder.reminder_text !== "string"
  )
    return false;
  if (
    !data.main_reminder.reminder_time ||
    typeof data.main_reminder.reminder_time !== "string"
  )
    return false;

  // Validate main reminder time
  const dateRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
  if (!dateRegex.test(data.main_reminder.reminder_time)) return false;

  // Validate main reminder date
  const [datePart, timePart] = data.main_reminder.reminder_time.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const mainDate = new Date(year, month - 1, day, hours, minutes);
  if (isNaN(mainDate.getTime())) return false;

  // Validate additional reminders if present
  if (data.reminders && Array.isArray(data.reminders)) {
    for (const reminder of data.reminders) {
      if (!reminder.reminder_text || typeof reminder.reminder_text !== "string")
        return false;
      if (!reminder.reminder_time || typeof reminder.reminder_time !== "string")
        return false;
      if (!dateRegex.test(reminder.reminder_time)) return false;

      // Validate reminder date
      const [rDatePart, rTimePart] = reminder.reminder_time.split(" ");
      const [rDay, rMonth, rYear] = rDatePart.split("/").map(Number);
      const [rHours, rMinutes] = rTimePart.split(":").map(Number);
      const reminderDate = new Date(rYear, rMonth - 1, rDay, rHours, rMinutes);
      if (isNaN(reminderDate.getTime())) return false;

      // Validate offset if present
      if (reminder.offset !== undefined) {
        if (
          typeof reminder.offset !== "number" &&
          typeof reminder.offset !== "string"
        )
          return false;
        if (
          typeof reminder.offset === "string" &&
          isNaN(Number(reminder.offset))
        )
          return false;
      }
    }
  }

  return true;
};

const handleReply = (geminiResponse) => {
  try {
    const outputData = JSON.parse(geminiResponse.text);
    node.warn(JSON.stringify(outputData, null, 2));

    if (outputData.type === "reminder_request") {
      if (!validateReminderData(outputData.data)) {
        throw new Error("Invalid reminder data structure");
      }

      const reminders = global.get("reminders") || [];
      const newReminders = [];

      // Add main reminder
      newReminders.push({
        ...outputData.data.main_reminder,
        is_recurring:
          outputData.data.main_reminder.is_recurring === "true" ||
          outputData.data.main_reminder.is_recurring === true,
        user: userDetails,
        yourReplyWas: outputData.reply,
        created_at: new Date().toISOString(),
      });

      // Add additional reminders if present
      if (
        outputData.data.reminders &&
        Array.isArray(outputData.data.reminders)
      ) {
        for (const reminder of outputData.data.reminders) {
          newReminders.push({
            ...reminder,
            is_recurring:
              reminder.is_recurring === "true" ||
              reminder.is_recurring === true,
            user: userDetails,
            yourReplyWas: outputData.reply,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Add all new reminders to the global list
      reminders.push(...newReminders);
      global.set("reminders", reminders);

      // Log the number of reminders created
      node.warn(`Created ${newReminders.length} reminders`);
    }

    msg.payload.content = outputData.reply;
    msg.payload.type = "message";
    msg.payload.options = {
      parse_mode: "Markdown",
    };
    node.send(msg);
  } catch (err) {
    node.error("Error handling reply: " + (err.message || err.toString()));
    msg.payload.content = `💥 ${userDetails.username}, something went wrong in the lab... - Probably Morty's fault. Try again!`;
    msg.payload.type = "message";
    node.send(msg);
  }
};

// Validate user details
if (!msg.originalMessage || !msg.originalMessage.from) {
  node.error("Invalid message format: missing user details");
  return null;
}

const userDetails = msg.originalMessage.from;
if (userDetails.username === "elab_innovations") {
  userDetails.moreInfo =
    'Name in your memory is "Ashad". An electronics engineer working in software industry';
}

const today = new Date();
const formattedDate = today.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const userInput = msg.payload.content || "Say something, Rick!";

// Send typing indicator
msg.payload.type = "action";
msg.payload.content = "typing";
node.send(msg);

msg.payload.type = "message";

(async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userInput,
      config: {
        systemInstruction: RICK_SYSTEM_INSTRUCTION.replace(
          "{userInfo}",
          JSON.stringify(userDetails, null, 2)
        ).replace("{formattedDate}", formattedDate),
        responseMimeType: "application/json",
      },
    });

    handleReply(response);
  } catch (err) {
    node.error("Gemini API error: " + (err.message || err.toString()), msg);
    msg.payload.content = `💥 ${userDetails.username}, the AI exploded... - Probably Morty's fault. Try again!`;
    msg.payload.type = "message";
    node.send(msg);
  }
})();
return null;
