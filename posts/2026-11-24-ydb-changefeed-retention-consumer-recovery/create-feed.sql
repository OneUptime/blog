ALTER TABLE `orders` ADD CHANGEFEED `recovery_feed` WITH (
    FORMAT = 'JSON',
    MODE = 'NEW_IMAGE',
    RETENTION_PERIOD = Interval('PT48H')
);
