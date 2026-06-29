import type { GKPriceResponse } from "../types/vol.ts";

interface Props {
  data: GKPriceResponse;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);

export function PriceResultPanel({ data }: Props) {
  const cards = [
    { label: "Option Price", value: data.price.toFixed(6), sub: `${data.price_pips.toFixed(2)} pips`, color: "#2563eb" },
    { label: "Premium (Domestic)", value: fmt(data.premium_domestic), sub: "In base currency", color: "#7c3aed" },
    { label: "Premium (Foreign)", value: fmt(data.premium_foreign), sub: "In foreign currency", color: "#0891b2" },
  ];

  return (
    <div className="summary-cards">
      {cards.map((c) => (
        <div key={c.label} className="summary-card" style={{ borderTopColor: c.color }}>
          <div className="summary-card-label">{c.label}</div>
          <div className="summary-card-value">{c.value}</div>
          <div className="summary-card-subvalue">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
