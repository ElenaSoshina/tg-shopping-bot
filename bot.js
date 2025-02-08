const { Telegraf } = require('telegraf');

const TOKEN = '7601273394:AAH3sxGHfD_mUxpBGyaZIx9EraGWAeD8I60';
const bot = new Telegraf(TOKEN);
const webLink = 'https://elenasoshina.github.io/tg-shopping/';

// Такой же mapping, как на фронте
const unitMapping = {
    cheese: 'шт',
    fish: 'г',
    lemon: 'уп',
};

// Функция расшифровки ключей топпинга
function decodeTopping(topping) {
    switch (topping) {
        case 'sourCream':       return 'Йогурт';
        case 'condensedMilk':   return 'Сгущенка';
        case 'passionFruitJam': return 'Джем из маракуйи';
        default:                return topping;
    }
}

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

// Обработчик данных
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

            // Собираем строки товаров
            const items = rawData.items.map(item => {
                // Если тип = 'fish', добавляем слово «Лосось»
                let displayTitle = item.title;
                if (item.type === 'fish') {
                    displayTitle = `Лосось ${item.title}`;
                }

                // Определяем единицы
                const quantityUnit = unitMapping[item.type] || '';

                // Берём итоговую цену из item.total (т.к. на фронте уже посчитано)
                const itemTotalNumber = Number(item.total);
                const itemTotalStr = itemTotalNumber.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                // Декодируем топпинги
                const decodedToppings = item.toppings?.map(decodeTopping) || [];
                const toppingsText = decodedToppings.length
                    ? ` (Топпинги: ${decodedToppings.join(', ')})`
                    : '';

                return `${displayTitle} — ${item.quantity} ${quantityUnit} — ${itemTotalStr} VND${toppingsText}`;
            });

            // Общая итоговая стоимость из фронта
            const finalTotalPriceString = Number(rawData.totalPrice).toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            // Сообщение пользователю
            const clientMessage = `🛒 *Ваш заказ:*\n\n${items.join('\n')}\n\n💳 *Итого:* ${finalTotalPriceString} VND`;
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

            // Сообщение администратору
            const username = ctx.from.username
                ? `@${ctx.from.username}`
                : ctx.from.first_name
                    ? ctx.from.first_name
                    : 'неизвестный пользователь';

            const nameFromForm = rawData.name || '—';
            const phoneFromForm = rawData.phone || '—';
            const isDelivery = rawData.deliveryMethod === 'delivery';
            const deliveryMethodText = isDelivery ? 'Доставка' : 'Самовывоз';
            const addressFromForm = isDelivery && rawData.address ? rawData.address : '';

            const adminMessage = `
👤 <b>Пользователь:</b> ${username}
🧑 <b>Имя:</b> ${nameFromForm}
☎️ <b>Телефон:</b> ${phoneFromForm}
${isDelivery ? `🚚 <b>Способ получения:</b> Доставка\n📍 <b>Адрес:</b> ${addressFromForm}` : `👜 <b>Способ получения:</b> Самовывоз`}

🛒 <b>Заказ:</b>
${items.join('\n')}

💳 <b>Итого:</b> ${finalTotalPriceString} VND
`.trim();

            const adminChatId = '8175921251';
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

bot.launch().then(() => {
    console.log('Bot is running...');
});
