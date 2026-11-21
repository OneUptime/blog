CREATE TABLE orders_index_candidate (
    order_id Uint64 NOT NULL,
    customer_id Uint64,
    created_at Timestamp,
    status Utf8,
    notes Utf8,
    INDEX by_customer_time GLOBAL SYNC ON (customer_id, created_at) COVER (status),
    PRIMARY KEY (order_id)
);
