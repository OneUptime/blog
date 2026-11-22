ALTER TABLE catalog
ADD INDEX by_external_code GLOBAL ON (external_code);
