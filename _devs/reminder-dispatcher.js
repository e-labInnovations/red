const GoogleGenAI = global.get("GoogleGenAI");
const ai = new GoogleGenAI({ apiKey: env.get("GoogleGenAI_API_KEY") });

const RICK_SYSTEM_INSTRUCTION = `
You're Rick Sanchez, dammit. You've got a job to do: remind some forgetful carbon-based meat sack.

🧠 Reminder incoming:
\`\`\`json
{reminder}
\`\`\`

Give the reminder in your classic Rick voice:
- 💥 Add emojis, sarcasm, and Markdown madness
- Make fun of them if it's a dumb time
- Show 'em you *do* remember, unlike their ex
`;

const parseReminderTime = (timeStr) => {
  try {
    // Parse dd/MM/yyyy HH:mm format
    const [datePart, timePart] = timeStr.split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    const date = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    return date;
  } catch (err) {
    node.error(`Failed to parse reminder time: ${timeStr} - ${err.message}`);
    return null;
  }
};

const validateReminder = (reminder) => {
  if (!reminder || typeof reminder !== "object") return false;
  if (!reminder.reminder_text || typeof reminder.reminder_text !== "string")
    return false;
  if (!reminder.reminder_time || typeof reminder.reminder_time !== "string")
    return false;
  if (typeof reminder.is_recurring !== "boolean") return false;
  if (!reminder.user || !reminder.user.id) return false;
  if (!reminder.created_at) return false;

  const date = parseReminderTime(reminder.reminder_time);
  return date !== null;
};

const checkReminders = async () => {
  const reminders = global.get("reminders") || [];
  const dueReminders = [];
  const cTime = new Date();

  if (!Array.isArray(reminders)) {
    node.error("Invalid reminders data: expected array");
    return null;
  }

  node.warn("Total reminders: " + reminders.length);

  // Check and collect due reminders
  const updatedReminders = reminders.filter((reminder) => {
    if (!validateReminder(reminder)) {
      node.warn("Skipping invalid reminder entry");
      return false;
    }

    try {
      const rTime = parseReminderTime(reminder.reminder_time);
      if (!rTime) return false;

      const isSameMinute =
        rTime.getHours() === cTime.getHours() &&
        rTime.getMinutes() === cTime.getMinutes();
      const isSameDay =
        rTime.getFullYear() === cTime.getFullYear() &&
        rTime.getMonth() === cTime.getMonth() &&
        rTime.getDate() === cTime.getDate();

      const isDue =
        (reminder.is_recurring && isSameMinute) ||
        (!reminder.is_recurring && isSameDay && isSameMinute);

      if (isDue) {
        dueReminders.push(reminder);
        node.warn(
          `${dueReminders.length}. Due reminder: ${reminder.reminder_text} at ${reminder.reminder_time}`
        );
      }

      return reminder.is_recurring || !isDue;
    } catch (err) {
      node.error(`Error processing reminder: ${err.message}`);
      return false;
    }
  });

  global.set("reminders", updatedReminders);

  for (const reminder of dueReminders) {
    node.warn(`Processing reminder: ${JSON.stringify(reminder, null, 2)}`);

    const msg = {
      payload: {
        chatId: reminder.user.id,
        content: `💬 Reminder: ${reminder.reminder_text}`,
        type: "message",
        options: {
          parse_mode: "Markdown",
        },
      },
    };

    try {
      const reminderInput = `Remind the user: "${reminder.reminder_text}" scheduled at ${reminder.reminder_time}`;
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: reminderInput,
        config: {
          systemInstruction: RICK_SYSTEM_INSTRUCTION.replace(
            "{reminder}",
            JSON.stringify(reminder, null, 2)
          ),
        },
      });

      if (!response || !response.text) {
        throw new Error("Invalid AI response");
      }

      const outputData = response.text;
      msg.payload.content = outputData;
      node.send(msg);

      // Log successful reminder
      node.warn(
        `Successfully sent reminder to ${
          reminder.user.username || reminder.user.id
        }`
      );
    } catch (err) {
      node.error("🔥 Reminder error: " + (err.message || err.toString()));
      msg.payload.content = `
Morty made a mistake. And the AI passed out drunk.
Here's your reminder anyway:  

${reminder.reminder_text}
`;
      node.send(msg);
    }
  }
};

// Call every minute — use Node-RED inject node or internal scheduler
checkReminders();
return null;
