-- =====================================================
-- SEED DATA - Creator Marketplace (MySQL)
-- =====================================================

SET @u_admin = UUID();
INSERT INTO users (id, name, email, password, role, avatar_url) VALUES
(@u_admin, 'Admin User', 'admin@marketplace.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin');

-- Brand users (password: password123)
SET @u_b1 = UUID(); SET @u_b2 = UUID(); SET @u_b3 = UUID();
INSERT INTO users (id, name, email, password, role, avatar_url) VALUES
(@u_b1, 'TechGiant Corp', 'techgiant@brand.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'brand', 'https://api.dicebear.com/7.x/initials/svg?seed=TG'),
(@u_b2, 'FashionForward Ltd', 'fashion@brand.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'brand', 'https://api.dicebear.com/7.x/initials/svg?seed=FF'),
(@u_b3, 'FoodieWorld', 'foodie@brand.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'brand', 'https://api.dicebear.com/7.x/initials/svg?seed=FW');

-- Creator users (password: password123)
SET @u_c1 = UUID(); SET @u_c2 = UUID(); SET @u_c3 = UUID(); SET @u_c4 = UUID(); SET @u_c5 = UUID();
INSERT INTO users (id, name, email, password, role, avatar_url) VALUES
(@u_c1, 'Priya Sharma', 'priya@creator.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya'),
(@u_c2, 'Rahul Verma', 'rahul@creator.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul'),
(@u_c3, 'Sneha Patel', 'sneha@creator.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha'),
(@u_c4, 'Arjun Kapoor', 'arjun@creator.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun'),
(@u_c5, 'Meera Nair', 'meera@creator.com', '$2b$10$i/Rofw8dJf.ZHHe8XVuE/OrMMygto1UI0JlpJ8J6L/IdrnhgLdiia', 'creator', 'https://api.dicebear.com/7.x/avataaars/svg?seed=meera');

SET @b1 = UUID(); SET @b2 = UUID(); SET @b3 = UUID();
INSERT INTO brand_profiles (id, user_id, company_name, industry, website) VALUES
(@b1, @u_b1, 'TechGiant Corp', 'Technology', 'https://techgiant.com'),
(@b2, @u_b2, 'FashionForward Ltd', 'Fashion & Lifestyle', 'https://fashionforward.com'),
(@b3, @u_b3, 'FoodieWorld', 'Food & Beverage', 'https://foodieworld.com');

-- Creator profiles (user IDs 5, 6, 7, 8, 9)
SET @c1 = UUID(); SET @c2 = UUID(); SET @c3 = UUID(); SET @c4 = UUID(); SET @c5 = UUID();
INSERT INTO creator_profiles (id, user_id, username, bio, category, city, country, verified, rating) VALUES
(@c1, @u_c1, 'priya_creates', 'Lifestyle & beauty content creator. Love sharing tips and reviews!', 'Lifestyle', 'Mumbai', 'India', 1, 4.80),
(@c2, @u_c2, 'rahul_tech', 'Tech reviewer and gadget enthusiast. 500K+ YouTube subscribers.', 'Technology', 'Bangalore', 'India', 1, 4.60),
(@c3, @u_c3, 'sneha_style', 'Fashion influencer and trend curator from Delhi.', 'Fashion', 'Delhi', 'India', 0, 4.30),
(@c4, @u_c4, 'arjun_memes', 'Running the most followed meme page on Instagram. Viral content daily!', 'Memes', 'Hyderabad', 'India', 1, 4.90),
(@c5, @u_c5, 'meera_food', 'Food blogger and recipe creator. Telegram channel with 50K foodies.', 'Food', 'Chennai', 'India', 1, 4.70);

INSERT INTO creator_platforms (creator_id, platform_name, username, profile_url, followers, engagement_rate) VALUES
(@c1, 'Instagram', '@priya_creates', 'https://instagram.com/priya_creates', 250000, 5.80),
(@c1, 'YouTube', 'Priya Creates', 'https://youtube.com/@priyacreates', 85000, 4.20),
(@c2, 'YouTube', 'Rahul Tech', 'https://youtube.com/@rahultech', 520000, 6.10),
(@c2, 'Instagram', '@rahul_tech', 'https://instagram.com/rahultech', 120000, 3.90),
(@c3, 'Instagram', '@sneha_style', 'https://instagram.com/snehastyle', 180000, 7.20),
(@c4, 'Instagram', '@arjun_memes_official', 'https://instagram.com/arjunmemes', 890000, 12.50),
(@c4, 'Telegram', 'Meme Palace', 'https://t.me/memepalace', 145000, 8.30),
(@c5, 'Telegram', 'Meera Food Diaries', 'https://t.me/meerafood', 52000, 15.20),
(@c5, 'Instagram', '@meera_food', 'https://instagram.com/meerafood', 95000, 6.80);

INSERT INTO promotion_packages (creator_id, package_name, description, price, delivery_days) VALUES
(@c1, 'Instagram Story Mention', '1 story with swipe-up link, 24hr visibility, 250K+ reach', 2500.00, 2),
(@c1, 'Instagram Post + Reel', 'Dedicated post + 30-sec reel, stays on profile forever', 8000.00, 5),
(@c2, 'YouTube Dedicated Review', '10-15 min dedicated product review video, 500K+ subscribers', 25000.00, 7),
(@c2, 'YouTube Integration (60s)', '60 second integration in my next tech video', 12000.00, 5),
(@c3, 'Instagram Fashion Collab', 'Full outfit post featuring your product with detailed caption', 5500.00, 3),
(@c4, 'Meme Page Post', 'Viral meme post featuring your brand organically, 900K reach', 15000.00, 1),
(@c4, 'Telegram Shoutout', 'Pinned promotional message to 145K Telegram subscribers', 4000.00, 1),
(@c5, 'Recipe Integration', 'Your product featured in a recipe video/post for food audience', 6000.00, 4),
(@c5, 'Telegram Campaign', '5 promotional messages over 1 week to 52K engaged foodies', 8500.00, 7);

SET @camp1 = UUID(); SET @camp2 = UUID(); SET @camp3 = UUID(); SET @camp4 = UUID();
INSERT INTO campaigns (id, brand_id, title, description, budget, category, status) VALUES
(@camp1, @b1, 'New Smartphone Launch', 'Looking for tech creators to review our latest flagship smartphone', 100000.00, 'Technology', 'active'),
(@camp2, @b2, 'Summer Collection Promo', 'Fashion creators needed for summer collection showcase', 50000.00, 'Fashion', 'active'),
(@camp3, @b3, 'Healthy Snack Launch', 'Food creators to promote our new range of healthy snacks', 35000.00, 'Food', 'active'),
(@camp4, @b1, 'App Download Campaign', 'Drive app downloads through creator promotions on all platforms', 75000.00, 'Technology', 'active');
