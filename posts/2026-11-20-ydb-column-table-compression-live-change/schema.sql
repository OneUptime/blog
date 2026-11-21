CREATE TABLE compression_events_lab (
    event_id Uint64 NOT NULL,
    event_time Timestamp,
    event_kind Utf8 COMPRESSION(algorithm=lz4),
    payload Utf8 COMPRESSION(algorithm=lz4),
    PRIMARY KEY (event_id)
)
PARTITION BY HASH (event_id)
WITH (STORE = COLUMN);
