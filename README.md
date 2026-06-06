# Рабочие курсы валют — rates.tokimoto.ru

Дашборд для ежедневного мониторинга курсов JPY, CNY, USD к рублю.

## Деплой на Vercel

1. Загрузить папку на GitHub (или через Vercel CLI)
2. Подключить репозиторий на vercel.com
3. В настройках проекта: Framework Preset → Create React App
4. Добавить домен rates.tokimoto.ru в Settings → Domains
5. В reg.ru добавить CNAME-запись:
   - Имя: rates
   - Значение: cname.vercel-dns.com
   - TTL: 3600

## Структура

- src/App.jsx — главный компонент дашборда
- src/index.js — точка входа React
- public/index.html — HTML-шаблон
