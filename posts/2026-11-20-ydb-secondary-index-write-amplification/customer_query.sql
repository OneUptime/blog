DECLARE $customer_id AS Uint64;
SELECT order_id, created_at, status
FROM orders_index_candidate VIEW by_customer_time
WHERE customer_id = $customer_id
ORDER BY created_at DESC, order_id DESC
LIMIT 20;
