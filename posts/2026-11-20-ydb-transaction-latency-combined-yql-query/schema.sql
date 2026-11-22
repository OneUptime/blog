CREATE TABLE customers (
    customer_id Uint64 NOT NULL,
    display_name Utf8,
    PRIMARY KEY (customer_id)
);

CREATE TABLE customer_orders (
    customer_id Uint64 NOT NULL,
    order_id Uint64 NOT NULL,
    amount_cents Int64 NOT NULL,
    PRIMARY KEY (customer_id, order_id)
);
