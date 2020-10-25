const Fs = require("fs");
const Path = require("path");
const Axios = require("axios");
require("dotenv").config();

//! saveImageToDisk             ==> Return Path
//! uploadImageToWP             ==> Return response.data.id
//! addSEOtoImage               ==> Return NOTHING
//! createCategory              ==> Return response.data.id;
//! createArticleWP             ==> Return response.data.id;
//! editArticleWithNewPicture   ==> Return NOTHING

//? DOWNLOAD IMAGE
exports.saveImageToDisk = async (
  url = "https://gdcourses.com/wp-content/uploads/2020/09/No_Image_Available.jpg",
  name = "no-name"
) => {
  const path = Path.resolve(__dirname, "../../files", `${name}.jpg`);
  const writer = Fs.createWriteStream(path);

  const response = await Axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
  return path;
};

//? UPLOAD IMAGE TO WP
const uploadImageToWP = async (
  path = Path.resolve(__dirname, "../../files", `default.jpg`)
) => {
  const response = await Axios({
    url: "http://topkotob.com/wp-json/wp/v2/media",
    method: "POST",
    headers: {
      "Content-Disposition": 'attachment; filename="file.jpg"',
      Authorization: process.env.WP_TOKEN,
      "Content-Type": "image/jpeg",
    },
    data: Fs.readFileSync(path, (err, data) => {
      if (err) {
        console.log(err);
      }
    }),
  });
  return response.data.id;
};

//? Edit Image SEO Tags
const addSEOtoImage = async (id, textSEO) => {
  await Axios({
    url: `http://topkotob.com/wp-json/wp/v2/media/${id}`,
    method: "PUT",
    headers: {
      Authorization: process.env.WP_TOKEN,
    },
    data: {
      description: {
        raw: textSEO,
      },
      alt_text: textSEO,
      caption: {
        raw: textSEO,
      },
      slug: textSEO,
      title: {
        raw: textSEO,
      },
    },
  });
};

//? Create Category
const createCategory = async (categoryName) => {
  try {
    const response = await Axios.post(
      "http://topkotob.com/wp-json/wp/v2/categories/",
      {
        name: categoryName,
      },
      {
        headers: {
          Authorization: process.env.WP_TOKEN,
        },
      }
    );
    if (response.data.code !== "term_exists") {
      return response.data.id;
    }
  } catch (error) {
    return error.response.data.data.term_id;
  }
};

const createArticleWP = async (fullHTML, title, categoryID = "Others") => {
  const response = await Axios.post(
    "http://topkotob.com/wp-json/wp/v2/posts",
    {
      title: title,
      content: fullHTML,
      status: "publish",
      categories: categoryID,
    },
    {
      headers: {
        Authorization: process.env.WP_TOKEN,
      },
    }
  );
  return response.data.id;
};

const editArticleWithNewPicture = async (articleID, imageID) => {
  await Axios.put(
    `http://topkotob.com/wp-json/wp/v2/posts/${articleID}`,
    {
      featured_media: imageID,
    },
    {
      headers: {
        Authorization: process.env.WP_TOKEN,
      },
    }
  );
};

//? SEND FULL ARTICLE TO WP
exports.sendToWP = async (fullHTML, title, category, path) => {
  let imageID = await uploadImageToWP(path);
  let categoryID = await createCategory(category);
  let articleID = await createArticleWP(fullHTML, title, categoryID);
  await addSEOtoImage(imageID, title);
  await editArticleWithNewPicture(articleID, imageID);
};
