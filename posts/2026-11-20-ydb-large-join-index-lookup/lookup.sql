SELECT
    r.external_code AS requested_code,
    c.product_id AS product_id,
    c.display_name AS display_name
FROM requested_products AS r
INNER JOIN catalog VIEW by_external_code AS c
    ON r.external_code = c.external_code
WHERE r.request_id = 'request-demo'u
ORDER BY requested_code, product_id;
