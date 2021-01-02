# AmoCRM widget generator

Генератор виджета для AmoCRM, репозиторий содержит готовый шаблон для написания виджета + автосборку для деплоя

### Установка

Для установки скачайте содержиое репозитория командой git clone и установите зависимости

```sh
$ git clone https://github.com/silenseram/amocrm-widget-generator.git
$ npm install
```

### Автосборка для деплоя

Как это работает: для обхода кеширования AmoCRM на время разработки, мы собираем в архив manifest.json, ланг-файл и картинки, туда же автоматически генерируется script.js, который будет подгружать настоящий файл скрипта с нашего сервера. **Важно!** Данное решение актуально лишь на этапе разработки виджета! 
Для сборки архива, находясь в папке с проектом, выполните команду

```sh
$ npm run build
```
Архив будет находиться в папке artifacts