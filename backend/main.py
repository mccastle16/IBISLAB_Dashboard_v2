from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates

app = FastAPI()

templates = Jinja2Templates(directory="../templates")
posts: list[dict] = [
    {
        "id": 1,
        "author": "Corey Schafer",
        "title": "FastAPI is Awesome",
        "content": "This framework is really easy to use and super fast.",
        "date_posted": "April 20, 2025",
    },
    {
        "id": 2,
        "author": "Jane Doe",
        "title": "Python is Great for Web Development",
        "content": "Python is a great language for web development, and FastAPI makes it even better.",
        "date_posted": "April 21, 2025",
    },
    {
        "id": 3,
        "author": "Alex Rivera",
        "title": "Getting Started with Pydantic",
        "content": "Pydantic makes data validation in Python clean and simple. Here's how to get started.",
        "date_posted": "April 22, 2025",
    },
    {
        "id": 4,
        "author": "Maria Chen",
        "title": "SQLAlchemy and FastAPI: A Perfect Pair",
        "content": "Combining SQLAlchemy with FastAPI gives you a powerful and flexible backend stack.",
        "date_posted": "April 23, 2025",
    },
    {
        "id": 5,
        "author": "James Okafor",
        "title": "Async Programming in Python",
        "content": "Understanding async and await in Python is key to building high-performance APIs.",
        "date_posted": "April 24, 2025",
    },
    {
        "id": 6,
        "author": "Priya Nair",
        "title": "Deploying FastAPI with Docker",
        "content": "Containerizing your FastAPI app with Docker makes deployment consistent and reproducible.",
        "date_posted": "April 25, 2025",
    },
]

@app.get("/", include_in_schema=False, name = "home")
@app.get("/posts", include_in_schema=False, name="posts")
def home(request: Request):
    return templates.TemplateResponse(request, "home.html", {"posts": posts, "title": "Home"})

@app.get("/api/posts")
def get_posts():
    return posts