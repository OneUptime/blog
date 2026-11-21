CREATE TABLE tenant_orders_partition_lab (
    bucket Uint32 NOT NULL,
    tenant_id Utf8 NOT NULL,
    order_id Uint64 NOT NULL,
    payload Utf8,
    PRIMARY KEY (bucket, tenant_id, order_id)
)
WITH (
    PARTITION_AT_KEYS = (1, 2, 3),
    AUTO_PARTITIONING_BY_LOAD = ENABLED,
    AUTO_PARTITIONING_MIN_PARTITIONS_COUNT = 4,
    AUTO_PARTITIONING_MAX_PARTITIONS_COUNT = 64
);
