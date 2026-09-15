"use client";

import { ChangeEvent, useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  }

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <div className="logo">
            Procure<span>AI</span>
          </div>

          <nav className="nav">
            <span>Как работает</span>
            <span>Для бизнеса</span>
            <span>Тарифы</span>
          </nav>

          <button className="primary-btn">Войти</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <div className="badge">
              ИИ для российских закупок
            </div>

            <h1>
              Сравнивайте предложения поставщиков
              <span> за минуты</span>
            </h1>

            <p>
              Загружайте заявки, Excel и PDF от поставщиков.
              ProcureAI сопоставит позиции, цены, наличие и сроки
              и поможет выбрать оптимальный вариант закупки.
            </p>

            <div className="card upload-card">
              <div className="upload-zone">
                <div className="upload-icon">📄</div>

                <h3>Загрузите документы закупки</h3>

                <p>
                  Excel, CSV, PDF — можно загрузить несколько файлов
                </p>

                <label className="primary-btn">
                  {files.length
                    ? `Выбрано файлов: ${files.length}`
                    : "Выбрать файлы"}

                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.pdf"
                    onChange={handleFiles}
                    hidden
                  />
                </label>
              </div>

              <div className="stats">
                <div className="card stat">
                  <div className="stat-label">Позиции</div>
                  <div className="stat-value">147</div>
                </div>

                <div className="card stat">
                  <div className="stat-label">Поставщики</div>
                  <div className="stat-value">8</div>
                </div>

                <div className="card stat">
                  <div className="stat-label">
                    Потенциальная экономия
                  </div>
                  <div className="stat-value">63 400 ₽</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard container">
          <h2>Пример результата анализа</h2>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Позиция</th>
                  <th>Поставщик</th>
                  <th>Цена</th>
                  <th>Наличие</th>
                  <th>Срок</th>
                  <th>Решение</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Подшипник 6205-2RS</td>
                  <td>ООО «ПромСнаб»</td>
                  <td>720 ₽</td>
                  <td>40 шт.</td>
                  <td>2 дня</td>
                  <td className="good">Оптимально</td>
                </tr>

                <tr>
                  <td>Кабель КГ 3×2.5</td>
                  <td>ЭлектроКомплект</td>
                  <td>185 ₽/м</td>
                  <td>250 м</td>
                  <td>1 день</td>
                  <td className="good">Оптимально</td>
                </tr>

                <tr>
                  <td>Контактор LC1D25</td>
                  <td>ЭнергоСнаб</td>
                  <td>4 820 ₽</td>
                  <td>8 шт.</td>
                  <td>3 дня</td>
                  <td className="warning">Проверить срок</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          ProcureAI · AI-закупщик для российского бизнеса
        </div>
      </footer>
    </>
  );
}
