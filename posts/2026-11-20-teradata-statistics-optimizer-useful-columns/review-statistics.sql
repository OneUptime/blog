HELP STATISTICS lab.orders;

COLLECT STATISTICS
    COLUMN (customer_id),
    COLUMN (order_date)
ON lab.orders;

COLLECT STATISTICS
    COLUMN (country_code, currency_code)
ON lab.orders;

HELP STATISTICS lab.orders;
