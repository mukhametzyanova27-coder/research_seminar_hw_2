import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwpb4DbX-_DGbFjYxfwgLxu2yqVnm8DcGFJYqiwU9TuK_IXT033AuEwtwsMD6gc4BP2/exec"; // <--- ТВОЯ ССЫЛКА ИЗ GOOGLE

let reviews = [];
let classifier;

const btn = document.getElementById('btn');
const fileUpload = document.getElementById('file-upload');
const status = document.getElementById('status');
const reviewDisplay = document.getElementById('review-display');
const resultBox = document.getElementById('result-box');

// 1. Инициализация модели при загрузке страницы
async function initModel() {
    try {
        status.textContent = "⏳ Загрузка нейросети (около 30Мб)...";
        classifier = await pipeline("text-classification", "Xenova/distilbert-base-uncased-finetuned-sst-2-english");
        status.textContent = "✅ Модель готова. Теперь загрузите файл с данными.";
    } catch (e) {
        status.textContent = "❌ Ошибка загрузки модели: " + e.message;
        console.error(e);
    }
}

// 2. Обработка загрузки файла
fileUpload.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    status.textContent = "⏳ Чтение файла...";

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            // Пытаемся найти колонку с текстом (может называться text, Review, body и т.д.)
            const headers = results.meta.fields;
            const textField = headers.find(h => 
                ['text', 'review', 'body', 'content', 'message'].includes(h.toLowerCase())
            ) || headers[0]; // Если не нашли, берем первую колонку

            reviews = results.data
                .map(row => row[textField])
                .filter(val => val && val.toString().trim().length > 0);

            if (reviews.length > 0) {
                status.textContent = `✅ Загружено отзывов: ${reviews.length} (колонка: "${textField}")`;
                btn.disabled = false;
                reviewDisplay.textContent = "Файл загружен успешно. Нажмите кнопку анализа.";
            } else {
                status.textContent = "❌ В файле не найдены текстовые данные.";
                btn.disabled = true;
            }
        },
        error: (err) => {
            status.textContent = "❌ Ошибка парсинга: " + err.message;
        }
    });
};

// 3. Функция отправки логов в Google Таблицу
async function logToGoogle(review, result) {
    const logData = {
        ts_iso: new Date().toISOString(),
        review: review,
        sentiment: `${result.label} (${Math.round(result.score * 100)}%)`,
        meta: {
            ua: navigator.userAgent,
            lang: navigator.language,
            res: `${screen.width}x${screen.height}`
        }
    };

    // Отправляем через fetch (режим no-cors для Google Scripts)
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData)
    });
}

// 4. Логика кнопки анализа
btn.onclick = async () => {
    if (!reviews.length) return;

    btn.disabled = true;
    resultBox.style.display = 'none';
    
    // Выбираем случайный текст
    const randomIndex = Math.floor(Math.random() * reviews.length);
    const selectedText = reviews[randomIndex];
    
    reviewDisplay.textContent = "🤖 Анализирую текст...";

    try {
        // Запуск нейросети
        const output = await classifier(selectedText);
        const prediction = output[0];

        // Отображение текста и результата
        reviewDisplay.textContent = `"${selectedText}"`;
        resultBox.textContent = `${prediction.label === 'POSITIVE' ? '👍' : '👎'} ${prediction.label} (${Math.round(prediction.score * 100)}%)`;
        resultBox.className = `result ${prediction.label}`;
        resultBox.style.display = 'block';

        // Логирование клика
        await logToGoogle(selectedText, prediction);

    } catch (err) {
        reviewDisplay.textContent = "❌ Ошибка при анализе.";
        console.error(err);
    } finally {
        btn.disabled = false;
    }
};

// Запуск
initModel();
