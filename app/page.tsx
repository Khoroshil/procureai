"use client";

import { ChangeEvent, useState } from "react";

type AnalysisResult = {
  success: boolean;
  requestFile: string;
  positionCount: number;
  matchedCount: number;
  unmatchedCount: number;
  supplierCount: number;
  totalCost: number;
  potentialSavings: number;
  results: {
    article: string;
    name: string;
    quantity: number;
    supplier: string | null;
    price: number | null;
    total: number | null;
    delivery: string | null;
    alternatives: {
      supplier: string;
      price: number;
      stock: number | null;
      delivery: string;
      score: number;
    }[];
  }[];
};

function formatRub(value: number | null) {
  if (value === null) return "—";

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [offerFiles, setOfferFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  function handleRequestFile(e: ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0] ?? null;
    setRequestFile(file);
    setAnalysis(null);
  }

  function handleOfferFiles(e: ChangeEvent<HTMLInputElement>) {
    setError("");
    const files = e.target.files
      ? Array.from(e.target.files)
      : [];

    setOfferFiles(files);
    setAnalysis(null);
  }

  async function analyze() {
    setError("");
    setAnalysis(null);

    if (!requestFile) {
      setError("Сначала загрузите заявку на закупку.");
      return;
    }

    if (!offerFiles.length) {
      setError("Загрузите хотя бы одно коммерческое предложение.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("request", requestFile);

      for (const file of offerFiles) {
        formData.append("offers", file);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Не удалось выполнить анализ."
        );
      }

      setAnalysis(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Произошла неизвестная ошибка."
      );
    } finally {
      setLoading(false);
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

          <button className="primary-btn">
            Войти
          </button>
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
              Загрузите заявку и коммерческие предложения.
              ProcureAI автоматически сравнит позиции,
              цены, наличие и сроки поставки.
            </p>

            <div className="card upload-card">
              <div className="upload-zone">
                <div className="upload-icon">📋</div>

                <h3>1. Заявка на закупку</h3>

                <p>
                  Excel или CSV с позициями и количеством
                </p>

                <label className="primary-btn">
                  {requestFile
                    ? requestFile.name
                    : "Выбрать заявку"}

                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleRequestFile}
                    hidden
                  />
                </label>
              </div>

              <div
                className="upload-zone"
                style={{ marginTop: 16 }}
              >
                <div className="upload-icon">📑</div>

                <h3>2. Коммерческие предложения</h3>

                <p>
                  Можно загрузить несколько Excel/CSV
                </p>

                <label className="primary-btn">
                  {offerFiles.length
                    ? `Выбрано КП: ${offerFiles.length}`
                    : "Выбрать КП"}

                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={handleOfferFiles}
                    hidden
                  />
                </label>
              </div>

              <button
                className="primary-btn"
                style={{
                  width: "100%",
                  marginTop: 18,
                  fontSize: 16,
                  padding: "16px 20px",
                }}
                onClick={analyze}
                disabled={loading}
              >
                {loading
                  ? "Анализируем закупку..."
                  : "Проанализировать закупку"}
              </button>

              {error && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    background: "#fff1f2",
                    color: "#be123c",
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            {analysis && (
              <div className="stats">
                <div className="card stat">
                  <div className="stat-label">
                    Позиции заявки
                  </div>
                  <div className="stat-value">
                    {analysis.positionCount}
                  </div>
                </div>

                <div className="card stat">
                  <div className="stat-label">
                    Поставщики
                  </div>
                  <div className="stat-value">
                    {analysis.supplierCount}
                  </div>
                </div>

                <div className="card stat">
                  <div className="stat-label">
                    Потенциальная экономия
                  </div>
                  <div className="stat-value">
                    {formatRub(analysis.potentialSavings)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {analysis && (
          <section className="dashboard container">
            <h2>
              Результат анализа
            </h2>

            <p style={{ color: "#667085", marginBottom: 18 }}>
              Обработано:{" "}
              <strong>{analysis.requestFile}</strong>
              {" · "}
              Найдено:{" "}
              <strong>{analysis.matchedCount}</strong>
              {" · "}
              Не найдено:{" "}
              <strong>{analysis.unmatchedCount}</strong>
              {" · "}
              Общая стоимость:{" "}
              <strong>
                {formatRub(analysis.totalCost)}
              </strong>
            </p>

            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Артикул</th>
                    <th>Позиция</th>
                    <th>Кол-во</th>
                    <th>Поставщик</th>
                    <th>Цена</th>
                    <th>Сумма</th>
                    <th>Срок</th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.results.map((item, index) => (
                    <tr key={`${item.article}-${index}`}>
                      <td>
                        {item.article || "—"}
                      </td>

                      <td>
                        {item.name}
                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>
                        {item.supplier || "Не найдено"}
                      </td>

                      <td>
                        {formatRub(item.price)}
                      </td>

                      <td>
                        {formatRub(item.total)}
                      </td>

                      <td>
                        {item.delivery || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="container">
          ProcureAI · AI-закупщик для российского бизнеса
        </div>
      </footer>
    </>
  );
}