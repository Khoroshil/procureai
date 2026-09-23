"use client";

import { ChangeEvent, useState } from "react";
import * as XLSX from "xlsx";

type Alternative = {
  supplier: string;
  price: number;
  stock: number | null;
  delivery: string;
  score: number;
};

type AnalysisRow = {
  article: string;
  name: string;
  quantity: number;
  supplier: string | null;
  price: number | null;
  total: number | null;
  delivery: string | null;
  alternatives: Alternative[];
};

type AnalysisResult = {
  success: boolean;
  requestFile: string;
  uploadedSuppliers: string[];
  positionCount: number;
  matchedCount: number;
  unmatchedCount: number;
  supplierCount: number;
  totalCost: number;
  bestSingleSupplierCost: number | null;
  potentialSavings: number | null;
  savingsMessage: string | null;
  optimalBreakdown: Record<
    string,
    {
      items: number;
      total: number;
    }
  >;
  results: AnalysisRow[];
};

function formatRub(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function downloadExcelReport(
  analysis: AnalysisResult
) {
  const reportDate =
    new Date().toLocaleDateString(
      "ru-RU"
    );

  const resultsRows =
    analysis.results.map((item) => ({
      Артикул:
        String(item.article || ""),
      "Наименование":
        String(item.name || ""),
      "Количество":
        Number(item.quantity || 0),
      "Поставщик":
        String(item.supplier || ""),
      "Цена, ₽":
        item.price === null
          ? ""
          : Number(item.price),
      "Сумма, ₽":
        item.total === null
          ? ""
          : Number(item.total),
      "Срок поставки":
        String(item.delivery || ""),
    }));

  const summaryRows = [
    {
      Показатель: "Дата отчёта",
      Значение: reportDate,
    },
    {
      Показатель: "Файл заявки",
      Значение:
        analysis.requestFile,
    },
    {
      Показатель:
        "Позиций в заявке",
      Значение:
        Number(analysis.positionCount),
    },
    {
      Показатель:
        "Найдено позиций",
      Значение:
        Number(analysis.matchedCount),
    },
    {
      Показатель:
        "Не найдено",
      Значение:
        Number(analysis.unmatchedCount),
    },
    {
      Показатель:
        "Поставщиков",
      Значение:
        Number(analysis.supplierCount),
    },
    {
      Показатель:
        "Оптимальная закупка, ₽",
      Значение:
        Number(analysis.totalCost),
    },
    {
      Показатель:
        "Закупка у одного поставщика, ₽",
      Значение:
        analysis.bestSingleSupplierCost ===
        null
          ? "Не рассчитывается"
          : Number(
              analysis.bestSingleSupplierCost
            ),
    },
    {
      Показатель:
        "Потенциальная экономия, ₽",
      Значение:
        analysis.potentialSavings ===
        null
          ? "Не рассчитывается"
          : Number(
              analysis.potentialSavings
            ),
    },
    {
      Показатель:
        "Комментарий",
      Значение:
        analysis.savingsMessage ||
        "Экономия рассчитана относительно наиболее выгодного варианта закупки у одного поставщика.",
    },
  ];

  const supplierRows =
    Object.entries(
      analysis.optimalBreakdown
    ).map(
      ([supplier, data]) => ({
        Поставщик: String(
          supplier
        ),
        "Количество позиций":
          Number(data.items),
        "Сумма, ₽":
          Number(data.total),
      })
    );

  const workbook =
    XLSX.utils.book_new();

  const resultSheet =
    XLSX.utils.json_to_sheet(
      resultsRows
    );

  const summarySheet =
    XLSX.utils.json_to_sheet(
      summaryRows
    );

  const supplierSheet =
    XLSX.utils.json_to_sheet(
      supplierRows
    );

  // Форматы числовых ячеек
  for (
    let row = 2;
    row <= resultsRows.length + 1;
    row++
  ) {
    const quantityCell =
      resultSheet[`C${row}`];

    const priceCell =
      resultSheet[`E${row}`];

    const totalCell =
      resultSheet[`F${row}`];

    if (quantityCell) {
      quantityCell.z = "0";
    }

    if (priceCell) {
      priceCell.z =
        '# ##0,00 "₽"';
    }

    if (totalCell) {
      totalCell.z =
        '# ##0,00 "₽"';
    }
  }

  // Сводка: денежные показатели
  const moneySummaryRows = [
    7,
    8,
    9,
  ];

  for (
    const row of moneySummaryRows
  ) {
    const cell =
      summarySheet[`B${row}`];

    if (
      cell &&
      typeof cell.v === "number"
    ) {
      cell.z =
        '# ##0,00 "₽"';
    }
  }

  // Поставщики
  for (
    let row = 2;
    row <= supplierRows.length + 1;
    row++
  ) {
    const itemsCell =
      supplierSheet[`B${row}`];

    const totalCell =
      supplierSheet[`C${row}`];

    if (itemsCell) {
      itemsCell.z = "0";
    }

    if (totalCell) {
      totalCell.z =
        '# ##0,00 "₽"';
    }
  }

  // Ширина колонок
  resultSheet["!cols"] = [
    { wch: 20 },
    { wch: 42 },
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
  ];

  summarySheet["!cols"] = [
    { wch: 38 },
    { wch: 55 },
  ];

  supplierSheet["!cols"] = [
    { wch: 30 },
    { wch: 24 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Сводка"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    resultSheet,
    "Результат"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    supplierSheet,
    "Поставщики"
  );

  XLSX.writeFile(
    workbook,
    "ProcureAI_отчет.xlsx"
  );
}

const telegramUrl =
  "https://t.me/Lafet29?text=" +
  encodeURIComponent(
    "Здравствуйте! У меня вопрос по работе ProcureAI."
  );

export default function Home() {
  const [requestFile, setRequestFile] =
    useState<File | null>(null);

  const [offerFiles, setOfferFiles] =
    useState<File[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  function handleRequestFile(
    e: ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const file =
      e.target.files?.[0] ?? null;

    setRequestFile(file);
    setAnalysis(null);
  }

  function handleOfferFiles(
    e: ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const files = e.target.files
      ? Array.from(e.target.files)
      : [];

    setOfferFiles((previousFiles) => {
      const allFiles = [
        ...previousFiles,
        ...files,
      ];

      const uniqueFiles =
        new Map<string, File>();

      for (const file of allFiles) {
        const key = [
          file.name,
          file.size,
          file.lastModified,
        ].join("-");

        uniqueFiles.set(key, file);
      }

      return Array.from(
        uniqueFiles.values()
      );
    });

    setAnalysis(null);
    e.target.value = "";
  }

  function removeOfferFile(
    indexToRemove: number
  ) {
    setOfferFiles((files) =>
      files.filter(
        (_, index) =>
          index !== indexToRemove
      )
    );

    setAnalysis(null);
  }

  async function analyze() {
    setError("");
    setAnalysis(null);

    if (!requestFile) {
      setError(
        "Сначала загрузите заявку на закупку."
      );
      return;
    }

    if (offerFiles.length === 0) {
      setError(
        "Загрузите хотя бы одно коммерческое предложение."
      );
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append(
        "request",
        requestFile
      );

      for (const file of offerFiles) {
        formData.append(
          "offers",
          file
        );
      }

      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Не удалось выполнить анализ."
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

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-btn"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            💬 Задать вопрос
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <div className="badge">
              ИИ для российских закупок
            </div>

            <h1>
              Сравнивайте предложения
              поставщиков
              <span> за минуты</span>
            </h1>

            <p>
              Загрузите заявку и
              коммерческие предложения.
              ProcureAI автоматически
              сравнит позиции, цены,
              наличие и сроки поставки.
            </p>

            <div className="card upload-card">
              <div className="upload-zone">
                <div className="upload-icon">
                  📋
                </div>

                <h3>
                  1. Заявка на закупку
                </h3>

                <p>
                  Excel или CSV с
                  позициями и количеством
                </p>

                <label className="primary-btn">
                  {requestFile
                    ? requestFile.name
                    : "Выбрать заявку"}

                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={
                      handleRequestFile
                    }
                    hidden
                  />
                </label>

                {requestFile && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: "#667085",
                    }}
                  >
                    Файл выбран
                  </div>
                )}
              </div>

              <div
                className="upload-zone"
                style={{ marginTop: 16 }}
              >
                <div className="upload-icon">
                  📑
                </div>

                <h3>
                  2. Коммерческие предложения
                </h3>

                <p>
                  Можно загрузить несколько
                  Excel или CSV
                </p>

                <label className="primary-btn">
                  Выбрать КП

                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={
                      handleOfferFiles
                    }
                    hidden
                  />
                </label>

                {offerFiles.length > 0 && (
                  <div
                    style={{
                      marginTop: 18,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      Загруженные КП:
                    </div>

                    {offerFiles.map(
                      (file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: 12,
                            padding:
                              "9px 11px",
                            background:
                              "#f6f8fb",
                            borderRadius: 10,
                            marginBottom: 6,
                            fontSize: 13,
                          }}
                        >
                          <span
                            style={{
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {file.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeOfferFile(
                                index
                              )
                            }
                            style={{
                              border: 0,
                              background:
                                "transparent",
                              color:
                                "#be123c",
                              cursor:
                                "pointer",
                              fontWeight: 700,
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="primary-btn"
                style={{
                  width: "100%",
                  marginTop: 18,
                  fontSize: 16,
                  padding: "16px 20px",
                  opacity: loading
                    ? 0.7
                    : 1,
                }}
                onClick={analyze}
                disabled={loading}
              >
                {loading
                  ? "Анализируем закупку..."
                  : "Проанализировать закупку"}
              </button>

              <div
                style={{
                  marginTop: 16,
                  paddingTop: 18,
                  borderTop:
                    "1px solid #edf0f5",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    color: "#667085",
                    fontSize: 13,
                    marginBottom: 9,
                  }}
                >
                  Нужна помощь с
                  загрузкой или результатом?
                </div>

                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#2563eb",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  💬 Задать вопрос онлайн
                </a>
              </div>

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
                  {analysis.potentialSavings === null
                    ? "—"
                    : formatRub(
                        analysis.potentialSavings
                      )}
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

            <p
              style={{
                color: "#667085",
                marginBottom: 18,
              }}
            >
              Обработано:{" "}
              <strong>
                {analysis.requestFile}
              </strong>
              {" · "}
              Найдено:{" "}
              <strong>
                {analysis.matchedCount}
              </strong>
              {" · "}
              Не найдено:{" "}
              <strong>
                {analysis.unmatchedCount}
              </strong>
              {" · "}
              Общая стоимость:{" "}
              <strong>
                {formatRub(
                  analysis.totalCost
                )}
              </strong>
            </p>

            {analysis.bestSingleSupplierCost !==
              null && (
              <div
                className="card"
                style={{
                  marginBottom: 20,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: 16,
                  }}
                >
                  <div>
                    <div className="stat-label">
                      Оптимальная закупка
                    </div>

                    <div className="stat-value">
                      {formatRub(
                        analysis.totalCost
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="stat-label">
                      У одного поставщика
                    </div>

                    <div className="stat-value">
                      {formatRub(
                        analysis.bestSingleSupplierCost
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="stat-label">
                      Экономия
                    </div>

                    <div className="stat-value">
                      {analysis.potentialSavings === null
                        ? "—"
                        : formatRub(
                            analysis.potentialSavings
                          )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analysis.savingsMessage && (
              <div
                className="card"
                style={{
                  marginBottom: 20,
                  padding: 20,
                  background: "#fffaf0",
                  border: "1px solid #f0d9a6",
                  color: "#7a5717",
                }}
              >
                <strong>
                  Экономия не рассчитана
                </strong>

                <div
                  style={{
                    marginTop: 7,
                    fontSize: 14,
                  }}
                >
                  {analysis.savingsMessage}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "#8a6a2a",
                  }}
                >
                  Чтобы рассчитать экономию,
                  загрузите предыдущую закупку
                  или коммерческое предложение,
                  которое используется как база
                  сравнения.
                </div>
              </div>
            )}

            <div
              className="card"
              style={{
                marginBottom: 20,
                padding: 24,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                Распределение закупки
              </h3>

              {Object.entries(
                analysis.optimalBreakdown
              ).map(
                ([supplier, breakdown]) => (
                  <div
                    key={supplier}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 20,
                      padding:
                        "12px 0",
                      borderBottom:
                        "1px solid #edf0f5",
                    }}
                  >
                    <span>
                      {supplier}
                    </span>

                    <strong>
                      {breakdown.items} поз. ·{" "}
                      {formatRub(
                        breakdown.total
                      )}
                    </strong>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() =>
                downloadExcelReport(
                  analysis
                )
              }
              style={{
                marginBottom: 20,
              }}
            >
              📊 Скачать Excel-отчёт
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => window.print()}
              style={{
                marginBottom: 20,
                marginLeft: 10,
              }}
            >
              📄 Сохранить PDF
            </button>

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
                  {analysis.results.map(
                    (item, index) => (
                      <tr
                        key={`${item.article}-${index}`}
                      >
                        <td>
                          {item.article ||
                            "—"}
                        </td>

                        <td>
                          {item.name}
                        </td>

                        <td>
                          {item.quantity}
                        </td>

                        <td>
                          {item.supplier ||
                            "Не найдено"}
                        </td>

                        <td>
                          {formatRub(
                            item.price
                          )}
                        </td>

                        <td>
                          {formatRub(
                            item.total
                          )}
                        </td>

                        <td>
                          {item.delivery ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div
              className="card"
              style={{
                marginTop: 20,
                padding: 24,
                textAlign: "center",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                Нужна помощь с результатом?
              </h3>

              <p
                style={{
                  color: "#667085",
                  marginBottom: 18,
                }}
              >
                Напишите нам — поможем
                разобраться с анализом
                закупки.
              </p>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                }}
              >
                💬 Задать вопрос онлайн
              </a>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="container">
          <div>
            ProcureAI · AI-закупщик
            для российского бизнеса
          </div>

          <div
            style={{
              marginTop: 8,
            }}
          >
            Поддержка:{" "}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              @Lafet29
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
