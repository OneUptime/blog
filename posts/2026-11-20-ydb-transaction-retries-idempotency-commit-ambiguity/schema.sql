CREATE TABLE retry_requests (
    request_id Utf8 NOT NULL,
    payload Utf8,
    PRIMARY KEY (request_id)
);
