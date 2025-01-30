const { Telegraf } = require('telegraf');

const TOKEN = '7601273394:AAH3sxGHfD_mUxpBGyaZIx9EraGWAeD8I60';
const bot = new Telegraf(TOKEN);
const webLink = 'https://creative-starlight-c66b84.netlify.app';



// Start Command
bot.start((ctx) => {
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name ? ctx.from.first_name : "Гость";
    const welcomeMessage = `🌟 Приветствуем ${username} в нашем гастрономическом райе Муйне! 🌟
    🐟 Нежный норвежский лосось — истинное удовольствие для гурманов.
    🥞 Сырники из домашнего творога — замороженные и готовые к употреблению.
    🍋 Освежающие лимоны — идеальный акцент для любого блюда.
    👇 Нажмите на кнопку ниже, чтобы открыть меню и сделать заказ. 👇`;
    ctx.reply(welcomeMessage, {
        reply_markup: {
            keyboard: [
                [{ text: 'Открыть меню', web_app: { url: webLink } }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });
});

// Обработчик данных из WebApp
bot.on('message', async (ctx) => {
    if (ctx.update.message?.web_app_data) {
        try {
            const rawDataString = ctx.update.message.web_app_data.data;
            const rawData = JSON.parse(rawDataString);
            if (!rawData.items || !Array.isArray(rawData.items)) {
                throw new Error('Invalid data: "items" must be an array.');
            }

            console.log("Raw data received:", rawData);

            const items = rawData.items.map(item => {
                console.log("Processing item:", item);
                // Проверяем, содержит ли название товара слово "Лосось"
                let title = item.title.includes('Лосось') ? `${item.title}` : item.title;
                let quantityString = '';
                if (title.includes('Лосось')) {
                    quantityString = `${item.quantity} г`; // Для рыбы указываем в граммах
                } else if (title.includes('Сырники')) {
                    quantityString = `${item.quantity} шт`; // Для сырников в штуках
                } else if (title.includes('Лимон')) {
                    quantityString = `${item.quantity} уп`; // Для лимонов в упаковках
                } else {
                    quantityString = `${item.quantity} шт`; // Для других товаров по умолчанию в штуках
                }

                const totalForItem = title.includes('Лосось') ? (Number(item.total) / 100).toFixed(2) : item.total;
                const toppings = item.toppings?.length
                    ? ` (Топпинги: ${item.toppings.map(topping => {
                        switch (topping) {
                            case 'sourCream': return 'Сметана';
                            case 'condensedMilk': return 'Сгущенка';
                            case 'passionFruitJam': return 'Джем из маракуйи';
                            default: return 'Неизвестный топпинг';
                        }
                    }).join(', ')})`
                    : '';

                return `${title} - ${quantityString} - ${totalForItem} VND${toppings}`;
            });

            const totalPrice = rawData.totalPrice;
            const finalTotalPrice = items.some(item => item.includes('Лосось')) ? (Number(totalPrice) / 100).toFixed(2) : totalPrice;

            const clientMessage = `🛒 *Ваш заказ:*\n\n${items.join('\n')}\n\n💳 *Итого:* ${finalTotalPrice} VND`;
            console.log("Sending message to user chat ID:", ctx.chat.id);
            await ctx.reply(clientMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{ text: 'Открыть меню', web_app: { url: webLink } }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: false
                }
            });

            // Сообщение для администратора
            const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name ? ctx.from.first_name : "неизвестный пользователь";
            const adminMessage = `👤 *Пользователь:* ${username}\n🛒 *Заказ:*\n\n${items.join('\n')}\n\n💳 *Итого:* ${finalTotalPrice} VND`;
            const adminChatId = '8175921251'; // ID чата администратора
            console.log("Sending admin message to adminChatId:", adminChatId);
            await bot.telegram.sendMessage(adminChatId, adminMessage, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: 'Написать пользователю',
                            url: `tg://user?id=${ctx.from.id}`
                        }
                    ]]
                }
            });
        } catch (error) {
            console.error('[ERROR] Processing WebApp data:', error.message);
            await ctx.reply('❌ Произошла ошибка при обработке вашего заказа.');
        }
    }
});

// Обработчик callback_query
bot.on('callback_query', async (ctx) => {
    try {
        await ctx.answerCbQuery();
    } catch (error) {
        console.error('[ERROR] Handling callback query:', error.message);
    }
});

// Запуск бота
bot.launch().then(() => {
    console.log('Bot is running...');
});
