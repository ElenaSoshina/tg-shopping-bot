const { Telegraf } = require('telegraf');

const TOKEN = '7601273394:AAH3sxGHfD_mUxpBGyaZIx9EraGWAeD8I60';
const bot = new Telegraf(TOKEN);
const webLink = 'https://elenasoshina.github.io/tg-shopping/';

// Start Command
bot.start((ctx) => {
    console.log('started');
    const username = ctx.from.username
        ? `@${ctx.from.username}`
        : ctx.from.first_name
            ? ctx.from.first_name
            : 'Гость';

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
    console.log("[DEBUG] Сообщение получено от WebApp:", JSON.stringify(ctx.update, null, 2));

    if (ctx.update.message?.web_app_data) {
        try {
            const rawDataString = ctx.update.message.web_app_data.data;
            console.log("[WEB APP DATA RECEIVED] Raw data string:", rawDataString);

            const rawData = JSON.parse(rawDataString);
            console.log("[WEB APP DATA PARSED] Parsed rawData:", rawData);

            if (!rawData.items || !Array.isArray(rawData.items)) {
                throw new Error('Invalid data: "items" must be an array.');
            }

            // Пересчитываем каждую позицию, формируем красивую строку
            let totalForAll = 0; // Для итоговой стоимости

            const items = rawData.items.map(item => {
                // Определяем единицу измерения и название
                let displayTitle = item.title;
                let quantityString = `${item.quantity} шт`; // по умолчанию

                if (item.type === 'fish') {
                    // Для рыбы: «Лосось <название>» и «г»
                    displayTitle = `Лосось ${item.title}`;
                    quantityString = `${item.quantity} г`;
                } else if (item.type === 'cheese') {
                    // Сырники в штуках
                    quantityString = `${item.quantity} шт`;
                } else if (item.type === 'lemon') {
                    // Лимоны в упаковках
                    quantityString = `${item.quantity} уп`;
                }

                // Считаем реальную стоимость, игнорируя item.total
                const priceNum = Number(item.price) || 0; // цена за 1 шт / г / уп
                const quantityNum = Number(item.quantity) || 0;
                const itemTotalNum = priceNum * quantityNum;
                totalForAll += itemTotalNum;

                // Форматируем как «xxx,xxx.00»
                const itemTotalStr = itemTotalNum.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                // Топпинги (если есть)
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

                // Пример строки: «Лосось Нарезка - 300 г - 480 000,00 VND (Топпинги: …)»
                return `${displayTitle} - ${quantityString} - ${itemTotalStr} VND${toppings}`;
            });

            // Форматируем итоговую стоимость
            const finalTotalPriceString = totalForAll.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            // Сообщение пользователю
            const clientMessage = `🛒 *Ваш заказ:*\n\n${items.join('\n')}\n\n💳 *Итого:* ${finalTotalPriceString} VND`;
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

            // --- Сообщение для администратора ---
            const username = ctx.from.username
                ? `@${ctx.from.username}`
                : ctx.from.first_name
                    ? ctx.from.first_name
                    : "неизвестный пользователь";

            const nameFromForm = rawData.name || '—';   // Имя пользователя из формы
            const phoneFromForm = rawData.phone || '—'; // Телефон из формы
            const isDelivery = rawData.deliveryMethod === 'delivery';
            const deliveryMethodText = isDelivery ? 'Доставка' : 'Самовывоз';
            const addressFromForm = isDelivery && rawData.address ? rawData.address : '';

            // Формируем аккуратный текст, без лишних отступов
            const adminMessage = `
👤 <b>Пользователь:</b> ${username}
🧑 <b>Имя:</b> ${nameFromForm}
☎️ <b>Телефон:</b> ${phoneFromForm}
${isDelivery ? `🚚 <b>Способ получения:</b> Доставка\n📍 <b>Адрес:</b> ${addressFromForm}` : `👜 <b>Способ получения:</b> Самовывоз`}

🛒 <b>Заказ:</b>
${items.join('\n')}

💳 <b>Итого:</b> ${finalTotalPriceString} VND
`.trim();

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
