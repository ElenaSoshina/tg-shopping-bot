# Используйте официальный образ Node.js как базовый
FROM node:14

# Создайте директорию для приложения внутри образа
WORKDIR /usr/src/app

# Копируйте файлы package.json и package-lock.json в рабочую директорию
COPY package*.json ./

# Установите зависимости
RUN npm install

# Копируйте все файлы проекта в рабочую директорию
COPY . .

# Определите переменные окружения
ENV TOKEN='7601273394:AAH3sxGHfD_mUxpBGyaZIx9EraGWAeD8I60'
ENV WEBLINK='https://creative-starlight-c66b84.netlify.app'

# Откройте порт, который будет прослушивать ваше приложение
EXPOSE 3000

# Запустите ваше приложение при запуске контейнера
CMD [ "node", "bot.js" ]
