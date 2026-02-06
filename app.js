import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwpb4DbX-_DGbFjYxfwgLxu2yqVnm8DcGFJYqiwU9TuK_IXT033AuEwtwsMD6gc4BP2/exec"; // <--- ТВОЯ ССЫЛКА ИЗ GOOGLE

let reviews = [];
let classifier;

const btn = document.getElementById('btn');
const status = document.getElementById('status');
const reviewDisplay = document.getElementById('review-display');
const resultBox = document.getElementById('result-box');

// 1. Загрузка нейросети и данных
async function init() {
    try {
        // Загрузка модели
        classifier = await pipeline("text-classification", "Xenova/distilbert-base-uncased-finetuned-sst-2-english");
        status.textContent = "Модель готова! Загрузка отзывов...";

        // Загрузка TSV
        const resp = await fetch('reviews_test.tsv');
        const text = await resp.text();
        
        Papa.parse(text, {
            header: true,
            delimiter: "\t",
            complete: (res) => {
                reviews = res.data.map(r => r.text).filter(t => t);
                status.textContent = "Всё готово. Можно анализировать!";
                btn.disabled = false;
            }
        });
    } catch (e) {
        status.textContent = "Ошибка: " + e.message;
    }
}

// 2. Функция логирования в Google Таблицу
async function logClick(review, result) {
    const data = {
        ts_iso: new Date().toISOString(),
        review: review,
        sentiment: `${result.label} (${Math.round(result.score * 100)}%)`,
        meta: {
            ua: navigator.userAgent,
            lang: navigator.language,
            res: `${screen.width}x${screen.height}`
        }
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(data)
    });
}

// 3. Обработка клика
btn.onclick = async () => {
    btn.disabled = true;
    const randomReview = reviews[Math.floor(Math.random() * reviews.length)];
    reviewDisplay.textContent = "Анализирую...";
    
    const output = await classifier(randomReview);
    const res = output[0];

    // Показываем результат
    reviewDisplay.textContent = randomReview;
    resultBox.textContent = `${res.label === 'POSITIVE' ? '👍' : '👎'} ${res.label} (${Math.round(res.score * 100)}%)`;
    resultBox.className = `result ${res.label}`;
    resultBox.style.display = 'block';

    // Отправляем данные в таблицу
    await logClick(randomReview, res);
    
    btn.disabled = false;
};

init();
