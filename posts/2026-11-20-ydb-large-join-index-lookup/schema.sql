CREATE TABLE requested_products (
    request_id Utf8 NOT NULL,
    external_code Utf8 NOT NULL,
    PRIMARY KEY (request_id, external_code)
);

CREATE TABLE catalog (
    product_id Uint64 NOT NULL,
    external_code Utf8,
    display_name Utf8,
    PRIMARY KEY (product_id)
);
