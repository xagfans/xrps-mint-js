## XRPS mint tool

The tool will read the input.txt line by line and submit the text to the Ripple network. 

**Install**

```JS
npm install
```

Open the main.js and replace YOUR_SECRET with your secret key **`s****************************`**.

**Mint**

```JS
node main.js
```

WARNING: There is a maximum number limit per account, this script does not check this limit. If the number of lines exceeds the limit, you will waste additional XRP. If you have minted 100 lines, then you should limit input.txt to 900 lines.
