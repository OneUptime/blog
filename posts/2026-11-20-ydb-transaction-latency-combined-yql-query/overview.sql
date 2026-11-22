DECLARE $customer_id AS Uint64;

$recent = (
    SELECT order_id, amount_cents
    FROM customer_orders
    WHERE customer_id = $customer_id
    ORDER BY order_id DESC
    LIMIT 20
);

SELECT display_name
FROM customers
WHERE customer_id = $customer_id;

SELECT order_id, amount_cents
FROM $recent
ORDER BY order_id DESC;

SELECT COUNT(*) AS displayed_order_count,
       SUM(amount_cents) AS displayed_total_cents
FROM $recent;
