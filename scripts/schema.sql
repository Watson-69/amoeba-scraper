-- amoeba-scraper MySQL Schema
-- Run via: npm run db:init

CREATE DATABASE IF NOT EXISTS `amoeba_scraper` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `amoeba_scraper`;

CREATE TABLE IF NOT EXISTS `torrents` (
  `id` VARCHAR(64) PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL,
  `size_bytes` BIGINT UNSIGNED NULL,
  `seeders` INT UNSIGNED DEFAULT 0,
  `leechers` INT UNSIGNED DEFAULT 0,
  `uploaded_at` DATETIME NULL,
  `category` VARCHAR(64) NULL,
  `source_site` VARCHAR(128) NOT NULL,
  `source_url` TEXT NULL,
  `magnet_link` TEXT NULL,
  `info_hash` CHAR(40) NULL,
  `description` MEDIUMTEXT NULL,
  `poster_url` TEXT NULL,
  `genres_json` JSON NULL,
  `year` SMALLINT UNSIGNED NULL,
  `rating` DECIMAL(3,1) NULL,
  `details` TEXT NULL,
  `last_scraped_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY `ft_title` (`title`, `description`),
  KEY `idx_category` (`category`),
  KEY `idx_uploaded` (`uploaded_at`),
  KEY `idx_seeders` (`seeders`),
  KEY `idx_source_site` (`source_site`),
  KEY `idx_info_hash` (`info_hash`),
  KEY `idx_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scrape logs for monitoring
CREATE TABLE IF NOT EXISTS `scrape_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `source_site` VARCHAR(128) NOT NULL,
  `status` ENUM('success', 'partial', 'failed') NOT NULL,
  `items_found` INT UNSIGNED DEFAULT 0,
  `items_inserted` INT UNSIGNED DEFAULT 0,
  `items_updated` INT UNSIGNED DEFAULT 0,
  `error_message` TEXT NULL,
  `started_at` DATETIME NOT NULL,
  `completed_at` DATETIME NULL,
  KEY `idx_source_started` (`source_site`, `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;