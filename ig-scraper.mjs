import axios from 'axios';
import path from 'path';
import { promises as fs } from 'fs';

let finalData = [];

const getData = async (tag, paginationToken = '') => {
  const options = {
    method: 'GET',
    url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/hashtag',
    params: { hashtag: encodeURI(tag) },
    headers: {
      'x-rapidapi-key': process.env.API_KEY,
      'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
    },
  };

  if (paginationToken !== '') {
    options.params.pagination_token = paginationToken;
  }

  const response = await axios.request(options);
  const respObj = response.data;
  const respData = respObj.data;

  return {
    data: respData,
    count: respData.count,
    mediaCount: respData.additional_data.media_count,
    paginationToken: respObj.pagination_token,
  };
};

async function fetchHashtagData(tag) {
  try {
    const tagItems = [];
    let currCount = 0;
    let currMediaCount = 0;
    let currPaginationToken = '';
    let maxLikes = { id: 0, count: 0 };
    let maxCommentsCount = { id: 0, count: 0 };
    let totalLikes = 0;
    let totalComments = 0;
    let loops = 0;

    const processTag = (data, count, mediaCount, paginationToken = '') => {
      for (const item in data.items) {
        const itemInfo = data.items[item];
        const itemCommentCount = itemInfo.comment_count;
        const itemLikesCount = itemInfo.like_count;
        const itemId = itemInfo.id;

        totalLikes += itemLikesCount;
        totalComments += itemCommentCount;

        if (itemLikesCount > maxLikes.count) {
          maxLikes = itemLikesCount;
        }

        if (itemCommentCount > maxCommentsCount.count) {
          maxCommentsCount = itemCommentCount;
        }

        tagItems.push({ itemId, itemCommentCount, itemLikesCount });
      }
      currCount = count;
      currMediaCount = mediaCount;
      currPaginationToken = paginationToken;

      return { count, mediaCount, paginationToken };
    };

    do {
      const { data, count, mediaCount, paginationToken } = await getData(
        tag,
        currPaginationToken
      );

      console.log('🚀 ~ fetchHashtagData ~ mediaCount:', mediaCount);
      console.log('🚀 ~ fetchHashtagData ~ count:', count);
      processTag(data, count, mediaCount, paginationToken);
      loops += 1;
    } while (currCount < currMediaCount && currCount < 500 && loops < 5);

    finalData.push({
      hashtag: tag,
      maxLikes,
      maxCommentsCount,
      totalLikes,
      totalComments,
      tagItems,
    });
  } catch (error) {
    console.error(error);
  }
}

const filePath = path.join(process.cwd(), 'hashtags.json');
const today = new Date();
const formattedDate =
  today.getFullYear().toString() +
  (today.getMonth() + 1).toString().padStart(2, '0') +
  today.getDate().toString().padStart(2, '0');
const saveFilePath = path.join(process.cwd(), 'data', `${formattedDate}.json`);

const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
const batchSize = 120;
const hashtags = data.hashtags;

// Split hashtags into batches and process them sequentially
for (let i = 0; i < hashtags.length; i += batchSize) {
  const batch = hashtags.slice(i, i + batchSize);

  await Promise.all(
    batch.map(async (hashtag, index) => {
      console.log(
        `🚀 ~ Processing hashtag: ${hashtag} (${i + index + 1}/${
          hashtags.length
        })`
      );
      await fetchHashtagData(hashtag);
    })
  );
}

fs.writeFile(
  saveFilePath,
  JSON.stringify({ data: finalData }, null, 2),
  (err) => {
    if (err) {
      console.error('Error writing file', err);
    } else {
      console.log('JSON file has been written successfully');
    }
  }
);
