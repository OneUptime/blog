STATIC EXPLAIN
SELECT c.region_code,
       SUM(o.order_total) AS Revenue
FROM lab.orders AS o
JOIN lab.customers AS c
  ON o.customer_id = c.customer_id
WHERE o.order_date >= DATE '2026-11-01'
  AND o.order_date < DATE '2026-12-01'
GROUP BY c.region_code;
