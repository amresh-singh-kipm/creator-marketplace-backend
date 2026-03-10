-- =====================================================
-- SEED DATA - Creator Marketplace (MySQL)
-- =====================================================

-- Admin user (password: password123  →  bcrypt hash)
INSERT INTO users (name, email, password, role, avatar_url) VALUES
('Admin User', 'admin@marketplace.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin');

-- Brand users (password: password123)
INSERT INTO users (name, email, password, role, avatar_url) VALUES
('TechGiant Corp', 'techgiant@brand.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'brand', 'https://api.dicebear.com/7.x/initials/svg?seed=TG'),
('FashionForward Ltd', 'fashion@brand.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'brand', 'https://api.dicebear.com/7.x/initials/svg?seed=FF'),
('FoodieWorld', 'foodie@brand.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'brand', 'https://api.dicebear.com/7.x/initials/svg?seed=FW');

-- Creator users (password: password123)
INSERT INTO users (name, email, password, role, avatar_url) VALUES
('Priya Sharma', 'priya@creator.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya'),
('Rahul Verma', 'rahul@creator.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul'),
('Sneha Patel', 'sneha@creator.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha'),
('Arjun Kapoor', 'arjun@creator.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun'),
('Meera Nair', 'meera@creator.com', '$2b$10$xV8mE3c0v5Rm3F7JUnvb6.cqiVc5p3PcqSVKl7WkbwxT8EtU8sHXm', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=meera');

-- Brand profiles (user IDs 2, 3, 4)
INSERT INTO brand_profiles (user_id, company_name, industry, website) VALUES
(2, 'TechGiant Corp', 'Technology', 'https://techgiant.com'),
(3, 'FashionForward Ltd', 'Fashion & Lifestyle', 'https://fashionforward.com'),
(4, 'FoodieWorld', 'Food & Beverage', 'https://foodieworld.com');

-- Creator profiles (user IDs 5, 6, 7, 8, 9)
INSERT INTO creator_profiles (user_id, username, bio, category, city, country, verified, rating) VALUES
(5, 'priya_creates', 'Lifestyle & beauty content creator. Love sharing tips and reviews!', 'Lifestyle', 'Mumbai', 'India', 1, 4.80),
(6, 'rahul_tech', 'Tech reviewer and gadget enthusiast. 500K+ YouTube subscribers.', 'Technology', 'Bangalore', 'India', 1, 4.60),
(7, 'sneha_style', 'Fashion influencer and trend curator from Delhi.', 'Fashion', 'Delhi', 'India', 0, 4.30),
(8, 'arjun_memes', 'Running the most followed meme page on Instagram. Viral content daily!', 'Memes', 'Hyderabad', 'India', 1, 4.90),
(9, 'meera_food', 'Food blogger and recipe creator. Telegram channel with 50K foodies.', 'Food', 'Chennai', 'India', 1, 4.70);

-- Creator platforms (creator_id 1–5 correspond to creator_profiles IDs)
INSERT INTO creator_platforms (creator_id, platform_name, username, profile_url, followers, engagement_rate) VALUES
(1, 'Instagram', '@priya_creates', 'https://instagram.com/priya_creates', 250000, 5.80),
(1, 'YouTube', 'Priya Creates', 'https://youtube.com/@priyacreates', 85000, 4.20),
(2, 'YouTube', 'Rahul Tech', 'https://youtube.com/@rahultech', 520000, 6.10),
(2, 'Instagram', '@rahul_tech', 'https://instagram.com/rahultech', 120000, 3.90),
(3, 'Instagram', '@sneha_style', 'https://instagram.com/snehastyle', 180000, 7.20),
(4, 'Instagram', '@arjun_memes_official', 'https://instagram.com/arjunmemes', 890000, 12.50),
(4, 'Telegram', 'Meme Palace', 'https://t.me/memepalace', 145000, 8.30),
(5, 'Telegram', 'Meera Food Diaries', 'https://t.me/meerafood', 52000, 15.20),
(5, 'Instagram', '@meera_food', 'https://instagram.com/meerafood', 95000, 6.80);

-- Promotion packages
INSERT INTO promotion_packages (creator_id, package_name, description, price, delivery_days) VALUES
(1, 'Instagram Story Mention', '1 story with swipe-up link, 24hr visibility, 250K+ reach', 2500.00, 2),
(1, 'Instagram Post + Reel', 'Dedicated post + 30-sec reel, stays on profile forever', 8000.00, 5),
(2, 'YouTube Dedicated Review', '10-15 min dedicated product review video, 500K+ subscribers', 25000.00, 7),
(2, 'YouTube Integration (60s)', '60 second integration in my next tech video', 12000.00, 5),
(3, 'Instagram Fashion Collab', 'Full outfit post featuring your product with detailed caption', 5500.00, 3),
(4, 'Meme Page Post', 'Viral meme post featuring your brand organically, 900K reach', 15000.00, 1),
(4, 'Telegram Shoutout', 'Pinned promotional message to 145K Telegram subscribers', 4000.00, 1),
(5, 'Recipe Integration', 'Your product featured in a recipe video/post for food audience', 6000.00, 4),
(5, 'Telegram Campaign', '5 promotional messages over 1 week to 52K engaged foodies', 8500.00, 7);

-- Campaigns
INSERT INTO campaigns (brand_id, title, description, budget, category, status) VALUES
(1, 'New Smartphone Launch', 'Looking for tech creators to review our latest flagship smartphone', 100000.00, 'Technology', 'active'),
(2, 'Summer Collection Promo', 'Fashion creators needed for summer collection showcase', 50000.00, 'Fashion', 'active'),
(3, 'Healthy Snack Launch', 'Food creators to promote our new range of healthy snacks', 35000.00, 'Food', 'active'),
(1, 'App Download Campaign', 'Drive app downloads through creator promotions on all platforms', 75000.00, 'Technology', 'active');
