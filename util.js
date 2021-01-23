function signout(){
    fetch("http://fap.bilbosjournal.com/signout").then(
        function (response) {
            console.log(response)
            return response.text();
        }).then(function (text) {
        console.log(text)
        window.location.href = "http://fap.bilbosjournal.com";
    }).catch(function (error) {
        console.log(error);
    })
}