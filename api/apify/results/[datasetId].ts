import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { datasetId, startDate, endDate } = req.query;
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    return res.status(400).json({ error: 'APIFY_API_TOKEN not configured' });
  }

  try {
    let response;
    let retries = 3;

    while (retries > 0) {
      response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
      if (response.ok) {
        break;
      }

      if (response.status >= 500) {
        retries--;
        await new Promise(r => setTimeout(r, 2000));
      } else {
        break;
      }
    }

    if (!response || !response.ok) {
      const errorText = await response?.text() || 'Unknown error';
      throw new Error(`Lỗi lấy dữ liệu (${response?.status}): ${errorText}`);
    }

    const items = await response.json();

    const posts: any[] = [];
    let filteredOutByDate = 0;

    items.forEach((item: any) => {
      // Filter by date range
      if (startDate || endDate) {
        const postDate = new Date(item.time || item.date || item.createdAt);
        if (!isNaN(postDate.getTime())) {
          if (startDate && postDate < new Date(startDate as string)) {
            filteredOutByDate++;
            return;
          }
          if (endDate && postDate > new Date((endDate as string) + 'T23:59:59Z')) {
            filteredOutByDate++;
            return;
          }
        }
      }

      // Extract images and create post objects
      let postImages: string[] = [];

      // Aggressive extraction from 'media' array
      if (item.media && Array.isArray(item.media)) {
        item.media.forEach((mediaItem: any) => {
          if (typeof mediaItem === 'string' && mediaItem.startsWith('http')) {
            postImages.push(mediaItem);
          } else if (typeof mediaItem === 'object' && mediaItem !== null) {
            if (mediaItem.image) postImages.push(mediaItem.image);
            if (mediaItem.url) postImages.push(mediaItem.url);
            if (mediaItem.thumbnail) postImages.push(mediaItem.thumbnail);
            if (mediaItem.src) postImages.push(mediaItem.src);
          }
        });
      }

      // Extract images from attachments (fallback)
      if (item.attachments && Array.isArray(item.attachments)) {
        item.attachments.forEach((att: any) => {
          if (att.media && att.media.image) postImages.push(att.media.image);
          else if (att.type === 'photo' && att.url) postImages.push(att.url);
          else if (att.url) postImages.push(att.url);
        });
      }

      // Fallback: Check direct properties
      if (item.image) postImages.push(item.image);
      if (item.images && Array.isArray(item.images)) {
        item.images.forEach((img: string) => postImages.push(img));
      }
      if (item.photo) postImages.push(item.photo);
      if (item.photos && Array.isArray(item.photos)) {
        item.photos.forEach((photo: any) => {
          if (typeof photo === 'string') postImages.push(photo);
          else if (photo.url) postImages.push(photo.url);
        });
      }

      // Filter valid images only
      const uniquePostImages = [...new Set(postImages)].filter(url => {
        if (typeof url !== 'string' || url.length < 5) return false;
        if (url.includes('/video/') || url.includes('/videos/') || url.includes('/reel/')) return false;
        if (url.includes('facebook.com/') && !url.includes('scontent') && !url.includes('fbcdn')) {
          return false;
        }
        if (url.includes('l.facebook.com')) return false;
        return true;
      });

      if (uniquePostImages.length === 0) return;

      const firstValidImageUrl = uniquePostImages[0];

      posts.push({
        imageUrl: firstValidImageUrl,
        text: item.text || item.message || '',
        likes: item.likes || item.likesCount || 0,
        comments: item.comments || item.commentsCount || 0,
        shares: item.shares || item.sharesCount || 0,
        postUrl: item.url || item.postUrl || '',
        date: item.time || item.date || item.createdAt || ''
      });
    });

    // Lọc trùng lặp bài viết
    const uniquePosts = posts.filter((post, index, self) =>
      index === self.findIndex((t) => t.postUrl === post.postUrl && t.postUrl !== '') ||
      (post.postUrl === '' && index === self.findIndex((t) => t.imageUrl === post.imageUrl))
    );

    res.json({
      posts: uniquePosts,
      debug: {
        totalItems: items.length,
        filteredOutByDate,
        sampleItem: items.length > 0 ? items[0] : null,
        sampleMedia: items.length > 0 ? items[0].media : null
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
