CREATE TABLE orders (
    tenant_id Utf8 NOT NULL,
    order_id Uint64 NOT NULL,
    status Utf8,
    payload String,
    PRIMARY KEY (tenant_id, order_id)
);
