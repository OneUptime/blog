DECLARE $warehouse_id AS Utf8;
DECLARE $sku AS Utf8;
SELECT sku, available
FROM inventory
WHERE warehouse_id = $warehouse_id AND sku = $sku;
