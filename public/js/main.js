$(function(){

    $('.load-more').on('click', function(){
        const btn = $(this);
        const loader = btn.find('span');
        $.ajax({
            url: '/data.html',
            type: 'GET',
            beforeSend: function(){
                btn.attr('disabled', true);
                loader.addClass('d-inline-block');
            },
            success: function(responce){
                setTimeout(function(){
                    loader.removeClass('d-inline-block');
                    btn.attr('disabled', false);
                    $('.after-posts').before(responce);
                }, 1000);
            },
            error: function(){
                alert('Error!');
                loader.removeClass('d-inline-block');
                btn.attr('disabled', false);
            }
        });
    });

    $('#modal-register').on('submit', function(e) {
        e.preventDefault()
        const email = $('#register-email').val()
        const password = $('#register-password').val()
        $('#register-email').val('')
        $('#register-password').val('')
        fetch('/register', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
        .then(() => console.log('Register successfull'))
        .catch(() => console.log('Login exists'))
    })

    $('#modal-login').on('submit', function(e) {
        e.preventDefault()
        const email = $('#login-email').val()
        const password = $('#login-password').val()
        fetch('/login', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        }).then((res) => {
                if (res.status.toString()[0] !== '2')
                    return res.text().then(err => Promise.reject(err))
                $('#login-email').val('')
                $('#login-password').val('')
                location.replace('/')
        }).catch(err => {
            $('#errors').text(err)
        })
    })

    $('#login-modal-open').click(function(e) {
        $('#modal-register').css('display', 'none')
        $('#modal-login').css('display', 'block')
    })
    $('#register-modal-open').click(function(e) {
        $('#modal-login').css('display', 'none')
        $('#modal-register').css('display', 'block')
    })

    $('#signout').click(function(e) {
        console.log('awdawd')
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        location.replace('/')
    })
});

$('#form').on('submit', function(e) {
    e.preventDefault()
    const comment = $('#comment').val()
    fetch('/telegram', {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({ comment })
    }).then((res) => {
            if (res.status.toString()[0] !== '2')
                return res.text().then(err => Promise.reject(err))
            location.replace('/')
    }).catch(err => {
        $('#errors').text(err)
    })
})