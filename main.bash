npm install

cp .env.example .env
# Edit .env with your credentials

npm run dev

heroku create your-nightlife-app
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set YELP_API_KEY=your_yelp_key
heroku config:set SESSION_SECRET=your_secret

git push heroku main
