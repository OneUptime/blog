ALTER TOPIC `orders/recovery_feed` SET (
    retention_period = Interval('PT48H')
);
