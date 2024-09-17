import json
hashtags = []

with open('./categorymap.csv', 'r') as f:
    for line in f:
        stripped = line.strip()
        splitted = stripped.split(',')
        target_word = splitted[-1]
        target_word = target_word.lower().replace(" ","").replace("&","")
        if(target_word not in hashtags):
            hashtags.append(target_word)



with open('hashtags.json', 'w') as file:
    # Write text to the file
    json.dump({"hashtags": hashtags}, file)

print(hashtags)