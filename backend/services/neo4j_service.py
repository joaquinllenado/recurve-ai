import os
from contextlib import contextmanager
from neo4j import GraphDatabase

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        uri = os.environ["NEO4J_URI"]
        user = os.environ["NEO4J_USERNAME"]
        password = os.environ["NEO4J_PASSWORD"]
        _driver = GraphDatabase.driver(uri, auth=(user, password))
    return _driver


@contextmanager
def get_session():
    driver = get_driver()
    database = os.environ.get("NEO4J_DATABASE", "neo4j")
    session = driver.session(database=database)
    try:
        yield session
    finally:
        session.close()


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None
