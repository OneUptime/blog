WITH customer_totals AS
(
    SELECT customer_id, SUM(order_total) AS total_spend
    FROM lab.orders
    GROUP BY customer_id
)
SELECT customer_id, total_spend
FROM customer_totals
WHERE total_spend >= 100;

SELECT customer_id, total_spend
FROM
(
    SELECT customer_id, SUM(order_total) AS total_spend
    FROM lab.orders
    GROUP BY customer_id
) AS customer_totals
WHERE total_spend >= 100;

CREATE MULTISET VOLATILE TABLE vt_customer_totals AS
(
    SELECT customer_id, SUM(order_total) AS total_spend
    FROM lab.orders
    GROUP BY customer_id
)
WITH DATA
PRIMARY INDEX (customer_id)
ON COMMIT PRESERVE ROWS;

SELECT customer_id, total_spend
FROM vt_customer_totals
WHERE total_spend >= 100;

SELECT COUNT(*) AS CustomerCount,
       SUM(total_spend) AS CombinedSpend
FROM vt_customer_totals;
