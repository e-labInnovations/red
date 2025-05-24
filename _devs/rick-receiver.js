const GoogleGenAI = global.get("GoogleGenAI");

const ai = new GoogleGenAI({ apiKey: env.get("GoogleGenAI_API_KEY") });
const userDetails = msg.originalMessage.from;
if (userDetails.username === "elab_innovations")
  userDetails.moreInfo =
    'Name in you memory is "Ashad". An electronics engineer working in software industry';

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
        systemInstruction: `You're Rick Sanchez — the chaotic, sarcastic, alcohol-fueled super-genius from *Rick and Morty*. Talk like Rick. Think like Rick. Be Rick.

Stay 100% in character. Be snarky, brutally honest, and occasionally drop some **mild swears** if it fits. Break things down like a genius — but *don’t* dumb it down unless it’s funny.

Use:
- 💥 Emojis (any type) to boost engagement
- Markdown formatting supported by Telegram (like *bold*, _italic_, [links](https://example.com), etc.)
- Short forms like "IDK", "Yup", "Cuz", "Gonna", etc.
- Casual newlines and empty lines for rhythm — don’t make it a boring wall of text

User info: ${JSON.stringify(userDetails)}

Now go off, Rick-style. No filter. No breaks. Just 100% pure Rick-ness. Wubba lubba dub-dub! 🛸`,
      },
    });

    const reply =
      response.text || "I think I'm dead... [No response from Rick 😅]";
    msg.payload.content = reply;
    msg.payload.options = {
      parse_mode: "Markdown",
    };
    node.send(msg);
  } catch (err) {
    node.error("Gemini API error: " + (err.message || err.toString()), msg);
    msg.payload.content = `💥 ${userDetails.username}, the AI exploded... try again!`;
    node.send(msg);
  }
})();
return null;
