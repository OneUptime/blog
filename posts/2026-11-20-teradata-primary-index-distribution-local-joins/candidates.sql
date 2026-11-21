CREATE MULTISET TABLE lab.orders_by_order
(
    order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    order_date DATE NOT NULL,
    order_total DECIMAL(18,2)
)
UNIQUE PRIMARY INDEX (order_id);

CREATE MULTISET TABLE lab.orders_by_customer
(
    order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    order_date DATE NOT NULL,
    order_total DECIMAL(18,2)
)
PRIMARY INDEX (customer_id);
