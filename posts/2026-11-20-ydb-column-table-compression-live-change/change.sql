ALTER TABLE compression_events_lab
ALTER COLUMN payload SET COMPRESSION(algorithm=zstd, level=3);
