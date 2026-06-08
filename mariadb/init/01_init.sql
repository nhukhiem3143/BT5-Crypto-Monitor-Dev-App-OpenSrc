-- =============================================================================
-- CRYPTO MONITOR - MariaDB Initialization
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `cryptodb` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cryptodb`;

-- ---------------------------------------------------------------------------
-- Table: realtime_prices
-- Stores the latest price for each symbol (upserted by Node-RED)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `realtime_prices` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `symbol`     VARCHAR(20)  NOT NULL,
    `price`      DECIMAL(20, 8) NOT NULL DEFAULT 0,
    `volume`     DECIMAL(30, 8) NOT NULL DEFAULT 0,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_symbol` (`symbol`),
    INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Table: price_alerts
-- Stores alert history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `price_alerts` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `symbol`      VARCHAR(20)  NOT NULL,
    `alert_type`  ENUM('HIGH', 'LOW') NOT NULL,
    `price`       DECIMAL(20, 8) NOT NULL,
    `threshold`   DECIMAL(20, 8) NOT NULL,
    `message`     TEXT,
    `sent_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_symbol` (`symbol`),
    INDEX `idx_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Seed initial rows for realtime_prices (will be upserted by Node-RED)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `realtime_prices` (`symbol`, `price`, `volume`) VALUES
    ('BTCUSDT', 0, 0),
    ('ETHUSDT', 0, 0),
    ('SOLUSDT', 0, 0);

-- ---------------------------------------------------------------------------
-- Grant privileges
-- ---------------------------------------------------------------------------
GRANT ALL PRIVILEGES ON `cryptodb`.* TO 'cryptouser'@'%';
FLUSH PRIVILEGES;