const http = require('http');
// Tiny server to keep Render happy
http.createServer((req, res) => { res.write("Bot Online"); res.end(); }).listen(process.env.PORT || 10000);

const mineflayer = require('mineflayer');
const fs = require('fs');

const MY_USERNAME = 'SKSER404'; 

const botOptions = {
    host: 'node.glorpiware.net', 
    port: 10002,
    username: 'Not_SK',
    version: '1.20.1',
    checkTimeoutInterval: 180000, 
    noDelay: true,                
    keepAlive: true,
    physicsEnabled: false,
    viewDistance: 'tiny' // 📉 The "Internet Shield" - uses almost zero data
};

let startTime = Date.now();
let manualQuit = false;
let mentionMemory = {}; 

function logAll(type, user, message) {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${type} | ${user}: ${message}`;
    console.log(entry);
    fs.appendFileSync('chat.log', entry + '\n');
}

async function performEat(bot) {
    const food = bot.inventory.items().find(i => 
        ['apple', 'cooked', 'bread', 'steak', 'pork', 'mutton', 'fish', 'golden'].some(n => i.name.includes(n))
    );
    if (food) {
        try {
            await bot.equip(food, 'hand');
            await bot.consume();
            logAll("ACTION", "BOT", `Ate ${food.name}`);
            return true;
        } catch (e) { return false; }
    }
    return false;
}

function createBot() {
    logAll("SYSTEM", "BOT", "🛡️ Final Night Sentry Active.");
    const bot = mineflayer.createBot(botOptions);
    startTime = Date.now();
    manualQuit = false;

    bot.on('login', () => {
        setTimeout(() => bot.chat("/login 80408040Sk"), 5000);
    });

    bot.on('health', () => { if (bot.food < 14) performEat(bot); });

    bot.on('playerJoined', (player) => {
        if (player.username === MY_USERNAME) {
            setTimeout(() => {
                bot.chat(`Welcome back, Master ${MY_USERNAME}!`);
                logAll("REPLY", "BOT", `Greeted Master ${MY_USERNAME}`);
            }, 3000); 
        }
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase();
        if (msg.includes('meow')) { bot.chat("Meow!"); logAll("CHAT", username, message); }
        if (msg.includes('not_sk')) { handleMention(bot, username, false); logAll("CHAT", username, message); }
    });

    bot.on('whisper', async (username, message) => {
        logAll("WHISPER", username, message);
        const msg = message.toLowerCase();
        if (msg.includes('not_sk')) handleMention(bot, username, true);
        if (username !== MY_USERNAME) return;

        const args = message.split(' ');
        const command = args[0].toLowerCase();

        if (command === '!help') {
            const r = "CMDS: !status, !food, !eat, !drop, !cmd, !resetmemory, !restart, !quit";
            bot.whisper(username, r); logAll("REPLY", "BOT", r);
        }
        else if (command === '!status') {
            const up = Math.floor((Date.now() - startTime) / 1000 / 60);
            const r = `❤️ HP: ${Math.round(bot.health)} | 🍖 Food: ${Math.round(bot.food)}/20 | 🕒 ${up}m`;
            bot.whisper(username, r); logAll("REPLY", "BOT", r);
        }
        else if (command === '!food') {
            const f = bot.inventory.items().filter(i => ['apple', 'cooked', 'bread', 'steak', 'pork', 'mutton', 'fish', 'golden'].some(n => i.name.includes(n)));
            const list = f.length ? f.map(i => `${i.count}x ${i.name}`).join(', ') : "None";
            bot.whisper(username, `🍱 Pantry: ${list}`); logAll("REPLY", "BOT", `Pantry: ${list}`);
        }
        else if (command === '!cmd') {
            const serverCmd = args.slice(1).join(' ');
            if (serverCmd) { bot.chat(`/${serverCmd}`); logAll("REPLY", "BOT", `Executed /${serverCmd}`); }
        }
        else if (command === '!drop') {
            const item = bot.inventory.slots[bot.getEquipmentDestSlot('hand')];
            if (item) { await bot.tossStack(item); logAll("REPLY", "BOT", `Dropped ${item.name}`); }
        }
        else if (command === '!eat') {
            const success = await performEat(bot);
            bot.whisper(username, success ? "✅ Eating..." : "❌ No food.");
        }
        else if (command === '!quit') {
            manualQuit = true; bot.chat("Bye!");
            setTimeout(() => { bot.quit(); setTimeout(() => process.exit(0), 500); }, 1000);
        }
        else if (command === '!restart') { bot.quit(); }
    });

    bot.on('error', (err) => logAll("ERROR", "SYSTEM", err.message));
    bot.on('end', () => {
        if (!manualQuit) {
            logAll("SYSTEM", "BOT", "🔌 Reconnecting...");
            setTimeout(createBot, 5000); // 5s fast reconnect
        }
    });
}

function handleMention(bot, username, isPrivate) {
    if (!mentionMemory[username]) mentionMemory[username] = 0;
    mentionMemory[username]++;
    let reply = (mentionMemory[username] === 1) ? "Hi!" : (mentionMemory[username] === 2) ? "I'm a bot." : "";
    if (reply) {
        isPrivate ? bot.whisper(username, reply) : bot.chat(reply);
        logAll("REPLY", "BOT", `${username} -> ${reply}`);
    }
}

createBot();
