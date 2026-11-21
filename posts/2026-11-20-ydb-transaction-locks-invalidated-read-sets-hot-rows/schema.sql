CREATE TABLE inventory (
    warehouse_id Utf8 NOT NULL,
    sku Utf8 NOT NULL,
    available Int64,
    PRIMARY KEY (warehouse_id, sku)
);
