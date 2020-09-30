<?php

if ( !defined('ABSPATH') ) define('ABSPATH', dirname(__FILE__) . '/');

define('DB_NAME', '<%= localWordPressDB.name %>');
define('DB_USER', '<%= localWordPressDB.user %>');
define('DB_PASSWORD', '<%= localWordPressDB.password %>');
define('DB_HOST', '<%= localWordPressDB.host %>');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');

require_once(ABSPATH . 'wp-settings.php');
