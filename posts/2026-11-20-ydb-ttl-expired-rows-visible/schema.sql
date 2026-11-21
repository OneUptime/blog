CREATE TABLE ttl_records_lab (
    record_id Utf8 NOT NULL,
    expire_at Timestamp,
    payload Utf8,
    PRIMARY KEY (record_id)
)
WITH (
    TTL = Interval("PT0S") ON expire_at
);
