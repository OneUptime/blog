CREATE TABLE events (
    event_id Uint64 NOT NULL,
    payload JsonDocument NOT NULL,
    INDEX payload_json GLOBAL USING json ON (payload),
    PRIMARY KEY (event_id)
);
