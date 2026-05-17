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
    viewDistance: 'tiny' 
};

let startTime = Date.now();
let lastMeowTime = 0; 
let manualQuit = false;
let foodsEaten = 0; 
let autoRestartMins = 360; 
let restartTimer;

function logAll(type, user, message) {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${type} | ${user}: ${message}`;
    console.log(entry);
    fs.appendFileSync('chat.log', entry + '\n');
}

// 🛡️ MEMORY WATCHDOG
function checkMemory() {
    const usage = process.memoryUsage().rss / 1024 / 1024;
    if (usage > 500) {
        logAll("CRITICAL", "SYSTEM", `RAM overload (${Math.round(usage)}MB). Resetting...`);
        process.exit(1);
    }
}
setInterval(checkMemory, 300000); 

function getFoodStats(bot) {
    const edibleNames = ['steak', 'cook', 'apple', 'bread', 'pork', 'mutton', 'fish', 'golden', 'cookie', 'melon', 'carrot', 'potato', 'pie', 'beef', 'chicken'];
    const foods = bot.inventory.items().filter(i => edibleNames.some(name => i.name.toLowerCase().includes(name)));
    let totalItems = 0;
    const list = foods.map(i => {
        totalItems += i.count;
        return `${i.count}x ${i.name}`;
    }).join(', ');
    return { list: list || "None", total: totalItems };
}

function countTotems(bot) {
    let count = bot.inventory.items().filter(item => item.name.includes('totem')).reduce((total, item) => total + item.count, 0);
    const offhand = bot.inventory.slots[45];
    if (offhand && offhand.name.includes('totem')) count += offhand.count;
    return count;
}

function createBot() {
    logAll("SYSTEM", "BOT", `🛡️ SKxAFK V6.0.5 Online.`);
    const bot = mineflayer.createBot(botOptions);
    startTime = Date.now();
    manualQuit = false;

    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => { if(!manualQuit) bot.quit(); }, autoRestartMins * 60000); 

    bot.on('login', () => {
        setTimeout(() => bot.chat("/login 80408040Sk"), 5000);
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        if (/meow/i.test(message)) {
            const now = Date.now();
            if (now - lastMeowTime > 30000) {
                bot.chat("Meow!"); 
                lastMeowTime = now;
            }
        }
    });

    bot.on('whisper', async (username, message) => {
        if (username === bot.username) return;
        if (username === MY_USERNAME) {
            const args = message.split(' ');
            const command = args[0].toLowerCase();

            if (command === '!status') {
                const upMins = Math.floor((Date.now() - startTime) / 60000);
                const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
                const t = countTotems(bot);
                const resp = `❤️ HP: ${Math.round(bot.health)} | 🍖 ${Math.round(bot.food)}/20 | 🛡️ ${t} | 🕒 ${upMins}m | 🍱 ${foodsEaten} | 💾 ${mem}MB`;
                bot.whisper(username, resp);
                return;
            }

            if (command === '!food') {
                const stats = getFoodStats(bot);
                bot.whisper(username, `🍱 Total: ${stats.total} | Pantry: ${stats.list}`);
                return;
            }

            // ✅ RESTORED: !cmd works again
            if (command === '!cmd') {
                const serverCmd = args.slice(1).join(' ');
                if (serverCmd) bot.chat(`/${serverCmd}`);
                return;
            }

            // ✅ RESTORED: !help is back
            if (command === '!help') {
                bot.whisper(username, "CMDS: !status, !food, !totem, !cmd [text], !restart, !quit");
                return;
            }

            if (command === '!totem') {
                bot.whisper(username, `🛡️ Total Totems: ${countTotems(bot)}`);
                return;
            }

            if (command === '!restart') {
                bot.whisper(username, "🔄 Restarting...");
                setTimeout(() => process.exit(1), 500); 
                return;
            }

            // ✅ FIXED: !quit now stops PM2 from restarting it
            if (command === '!quit') {
                manualQuit = true; 
                bot.whisper(username, "🛑 Killing process."); 
                setTimeout(() => { 
                    bot.quit(); 
                    // This command tells PM2 to stop this specific process
                    const exec = require('child_process').exec;
                    exec('pm2 stop Not_SK'); 
                }, 1000); 
                return;
            }
        } 
        
        if (/meow/i.test(message)) {
            const now = Date.now();
            if (now - lastMeowTime > 30000) {
                bot.chat(`/msg ${username} Meow!`); 
                lastMeowTime = now;
            }
        }
    });

    bot.on('health', async () => { 
        if (bot.food < 16) {
            const edibleNames = ['steak', 'cook', 'apple', 'bread', 'pork', 'mutton', 'fish', 'golden', 'cookie', 'melon', 'carrot', 'potato', 'pie', 'beef', 'chicken'];
            const food = bot.inventory.items().find(i => edibleNames.some(n => i.name.toLowerCase().includes(n)));
            if (food) { try { await bot.equip(food, 'hand'); await bot.consume(); foodsEaten++; } catch (e) {} }
        }
        const totem = bot.inventory.items().find(item => item.name.includes('totem'));
        const offhand = bot.inventory.slots[45]; 
        if (totem && (!offhand || !offhand.name.includes('totem'))) { try { await bot.equip(totem, 'off-hand'); } catch (e) {} }
    });

    bot.on('end', () => {
        clearTimeout(restartTimer);
        if (!manualQuit) setTimeout(createBot, 30000); 
    });
}

createBot();
