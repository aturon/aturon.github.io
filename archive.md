---
layout: page
title: Archive
---

{% for post in site.posts %}
  * {{ post.date | date_to_string }} &raquo; [ {{ post.title }} ](/blog{{ post.url }})
{% endfor %}
