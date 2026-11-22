DECLARE $tenant_id AS Utf8;
DECLARE $page_size AS Uint64;
SELECT order_id, status
FROM orders
WHERE tenant_id = $tenant_id
ORDER BY order_id
LIMIT $page_size;
